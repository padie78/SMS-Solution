import { Injectable } from '@angular/core';

/**
 * Resultado normalizado del parser de `extractedData` (AppSync subscription).
 *
 * Mantenemos un `Record<string, unknown>` flexible porque la IA puede agregar
 * campos opcionales (cups, meter_serial_number, etc.) que aún no consumimos
 * en la versión pro del wizard, pero queremos preservar trazables.
 */
export type ParsedInvoiceExtraction = Record<string, unknown>;

/**
 * Servicio de capa L3 (Business) — único responsable de normalizar el
 * `extractedData` proveniente de la subscription AppSync `onInvoiceUpdated`.
 *
 * Soporta los formatos observados en producción:
 *  - Objeto ya parseado (caso ideal).
 *  - String JSON puro.
 *  - String JSON entre comillas externas (AWSJSON doble-codificado).
 *  - Code-fence ```json ... ```
 *  - Java/AppSync map literal: `{vendor=Acme, total_amount=12.3}`.
 *  - JSON con escape doble (`\\"`).
 *  - Formato flexible `key=value` (último recurso).
 *
 * Lógica extraída intacta de `validation.component.ts` (refactor a servicio
 * para evitar duplicación entre el flujo legacy y el wizard pro).
 */
@Injectable({ providedIn: 'root' })
export class InvoiceExtractionParserService {
  /** Punto de entrada principal — devuelve `{}` si no se pudo parsear. */
  parse(raw: unknown): ParsedInvoiceExtraction {
    if (raw == null) {
      return {};
    }
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      return raw as ParsedInvoiceExtraction;
    }
    if (typeof raw !== 'string') {
      return {};
    }

    let normalized = this.normalizeExtractedDataString(raw);
    normalized = this.unwrapQuotedPayloadString(normalized);
    if (!normalized) {
      return {};
    }

    const candidates: string[] = [normalized];
    const balanced = this.extractFirstBalancedJson(normalized);
    if (balanced && balanced !== normalized) {
      candidates.push(balanced);
    }

    for (const cand of candidates) {
      const rec = this.tryParseJsonRecord(cand);
      if (rec) return rec;
    }

    const looksEscapedJson =
      normalized.includes('\\"') && (normalized.includes('{') || normalized.includes('['));
    if (looksEscapedJson) {
      const unescaped = normalized
        .replace(/\\\\n/g, '\\n')
        .replace(/\\\\r/g, '\\r')
        .replace(/\\\\t/g, '\\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      const rec = this.tryParseJsonRecord(unescaped);
      if (rec) return rec;
      const bal = this.extractFirstBalancedJson(unescaped);
      if (bal) {
        const rec2 = this.tryParseJsonRecord(bal);
        if (rec2) return rec2;
      }
    }

    const javaRecord = this.parseJavaStyleExtractedRecord(normalized);
    if (javaRecord) return javaRecord;

    if (!normalized.includes('{') && normalized.includes('=')) {
      return this.parseFlexibleString(normalized);
    }

    return {};
  }

  // ── Normalizers ────────────────────────────────────────────────────────────

  private normalizeExtractedDataString(raw: string): string {
    let s = raw.replace(/^\uFEFF/, '').trim();
    const fenced = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/im.exec(s);
    if (fenced?.[1]) {
      s = fenced[1].trim();
    }
    return s;
  }

  private unwrapQuotedPayloadString(s: string): string {
    const t = s.trim();
    if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
      try {
        const once = JSON.parse(t) as unknown;
        return typeof once === 'string' ? once.trim() : t;
      } catch {
        return t.slice(1, -1).trim();
      }
    }
    return t;
  }

  // ── Java-style map literal (VTL mal serializado) ───────────────────────────

  private looksLikeJavaMapLiteral(s: string): boolean {
    return /^\{\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(s.trim());
  }

  private splitTopLevelCommas(inner: string): string[] {
    const parts: string[] = [];
    let start = 0;
    let dParen = 0;
    let dCurly = 0;
    let dBracket = 0;
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if (c === '(') dParen++;
      else if (c === ')') dParen--;
      else if (c === '{') dCurly++;
      else if (c === '}') dCurly--;
      else if (c === '[') dBracket++;
      else if (c === ']') dBracket--;
      else if (c === ',' && dParen === 0 && dCurly === 0 && dBracket === 0) {
        parts.push(inner.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(inner.slice(start).trim());
    return parts.filter((p) => p.length > 0);
  }

  private consumeBalanced(full: string, open: string, close: string): string | undefined {
    if (!full.startsWith(open)) return undefined;
    let depth = 0;
    for (let i = 0; i < full.length; i++) {
      if (full[i] === open) depth++;
      else if (full[i] === close) {
        depth--;
        if (depth === 0) return full.slice(0, i + 1);
      }
    }
    return undefined;
  }

  private parseJavaMapObject(src: string): Record<string, unknown> {
    const t = src.trim();
    if (!t.startsWith('{') || !t.endsWith('}')) return {};
    const body = t.slice(1, -1).trim();
    if (!body) return {};
    const out: Record<string, unknown> = {};
    for (const part of this.splitTopLevelCommas(body)) {
      const eq = part.indexOf('=');
      if (eq <= 0) continue;
      const key = part.slice(0, eq).trim();
      const rest = part.slice(eq + 1).trim();
      if (!key) continue;
      out[key] = this.parseJavaMapValue(rest);
    }
    return out;
  }

  private parseJavaMapArray(src: string): unknown[] {
    const t = src.trim();
    if (!t.startsWith('[') || !t.endsWith(']')) return [];
    const inner = t.slice(1, -1).trim();
    if (!inner) return [];
    return this.splitTopLevelCommas(inner).map((p) => this.parseJavaMapValue(p.trim()));
  }

  private parseJavaMapValue(rest: string): unknown {
    const v = rest.trim();
    if (!v) return '';
    if (v.startsWith('{')) {
      const frag = this.consumeBalanced(v, '{', '}');
      return frag ? this.parseJavaMapObject(frag) : v;
    }
    if (v.startsWith('[')) {
      const frag = this.consumeBalanced(v, '[', ']');
      return frag ? this.parseJavaMapArray(frag) : v;
    }
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)) return Number(v);
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null') return null;
    return v;
  }

  private parseJavaStyleExtractedRecord(raw: string): Record<string, unknown> | undefined {
    let s = raw.trim();
    s = this.unwrapQuotedPayloadString(s);
    if (!this.looksLikeJavaMapLiteral(s)) return undefined;
    const parsed = this.parseJavaMapObject(s);
    return Object.keys(parsed).length > 0 ? parsed : undefined;
  }

  // ── JSON balanceado + repair ──────────────────────────────────────────────

  private extractFirstBalancedJson(text: string): string | undefined {
    const start = text.indexOf('{');
    if (start === -1) return undefined;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (inString) {
        if (c === '\\') escapeNext = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    return undefined;
  }

  private recordFromParsed(parsed: unknown): Record<string, unknown> | undefined {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    if (Array.isArray(parsed)) {
      return { invoice_lines: parsed };
    }
    return undefined;
  }

  private repairJsonLike(candidate: string): string {
    let s = candidate.trim();
    s = s.replace(/,\s*([}\]])/g, '$1');
    s = s.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
    s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner: string) => {
      const unescaped = inner.replace(/\\"/g, '"');
      const escaped = unescaped.replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    return s;
  }

  private tryParseJsonRecord(candidate: string): Record<string, unknown> | undefined {
    const t = candidate.trim();
    if (!t) return undefined;
    try {
      const first = JSON.parse(t) as unknown;
      if (typeof first === 'string') {
        const inner = first.trim();
        const nested = this.tryParseJsonRecord(inner);
        if (nested) return nested;
        const embedded = this.extractFirstBalancedJson(inner);
        if (embedded) {
          return this.tryParseJsonRecord(embedded);
        }
        return undefined;
      }
      return this.recordFromParsed(first);
    } catch {
      const repaired = this.repairJsonLike(t);
      if (repaired !== t) {
        try {
          const first = JSON.parse(repaired) as unknown;
          return this.recordFromParsed(first);
        } catch {
          return undefined;
        }
      }
      return undefined;
    }
  }

  private parseFlexibleString(str: string | null | undefined): Record<string, unknown> {
    if (str == null || !str.trim()) {
      return {};
    }
    const s = str.trim();

    try {
      const jsonStyle = s
        .replace(/([a-zA-Z0-9_]+)=/g, '"$1":')
        .replace(/:(?!\s*[{[])([^,}]+)/g, (match, p1: string) => {
          const val = p1.trim();
          if (val === 'null') {
            return ':null';
          }
          if (val === 'true' || val === 'false') {
            return `:${val}`;
          }
          if (!isNaN(Number(val)) && val.length > 0) {
            return `:${val}`;
          }
          return `:"${val.replace(/"/g, '\\"')}"`;
        });

      return JSON.parse(jsonStyle) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

/**
 * Vista normalizada para el form del wizard pro. Únicamente expone los campos
 * que el form de extracción usa actualmente (lo demás queda en `extras`).
 */
export interface InvoiceExtractionFields {
  readonly vendor: string;
  readonly vendorTaxId: string;
  readonly invoiceNumber: string;
  readonly invoiceDate: Date | null;
  readonly billingPeriodStart: Date | null;
  readonly billingPeriodEnd: Date | null;
  readonly totalAmount: number | null;
  readonly consumptionValue: number | null;
  readonly consumptionUnit: string;
}

/**
 * Mapper auxiliar — toma el record genérico y produce el shape para patchear
 * el FormGroup de extracción. Conserva valores numéricos / fechas tipadas.
 */
export function mapParsedToExtractionFields(
  parsed: ParsedInvoiceExtraction
): InvoiceExtractionFields {
  const vendor = stringOrEmpty(parsed['vendor']);
  const vendorTaxId = stringOrEmpty(
    parsed['VENDOR_TAX_ID'] ?? parsed['vendor_tax_id'] ?? parsed['holder_tax_id']
  );
  const invoiceNumber = stringOrEmpty(parsed['invoice_number'] ?? parsed['invoiceNumber']);
  const invoiceDate = toDateOrNull(parsed['invoice_date'] ?? parsed['invoiceDate']);

  const billing = (parsed['billing_period'] ?? parsed['billingPeriod']) as
    | Record<string, unknown>
    | undefined;
  const billingPeriodStart = toDateOrNull(billing?.['start']);
  const billingPeriodEnd = toDateOrNull(billing?.['end']);

  const totalAmount = toNumberOrNull(parsed['total_amount'] ?? parsed['totalAmount']);

  const linesRaw = parsed['lines'] ?? parsed['invoice_lines'] ?? parsed['emission_lines'];
  const { consumptionValue, consumptionUnit } = extractConsumption(linesRaw, parsed);

  return {
    vendor,
    vendorTaxId,
    invoiceNumber,
    invoiceDate,
    billingPeriodStart,
    billingPeriodEnd,
    totalAmount,
    consumptionValue,
    consumptionUnit
  };
}

function stringOrEmpty(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const name = (value as Record<string, unknown>)['name'];
    if (typeof name === 'string') return name.trim();
  }
  return '';
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const candidate = obj['total_with_tax'] ?? obj['total'] ?? obj['amount'] ?? obj['value'];
    return toNumberOrNull(candidate);
  }
  return null;
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : new Date(ms);
  }
  return null;
}

/**
 * Heurística simple: suma los `value` (kWh / m3 / ...) de las líneas físicas
 * (no monetarias). Si la IA mandó `ai_analysis.value` ya consolidado lo usa.
 */
function extractConsumption(
  linesRaw: unknown,
  parsed: ParsedInvoiceExtraction
): { consumptionValue: number | null; consumptionUnit: string } {
  const ai = (parsed['ai_analysis'] ?? parsed['aiAnalysis']) as
    | Record<string, unknown>
    | undefined;
  if (ai && typeof ai === 'object') {
    const aiVal = toNumberOrNull(ai['value']);
    const aiUnit = typeof ai['unit'] === 'string' ? (ai['unit'] as string) : '';
    if (aiVal !== null) {
      return { consumptionValue: aiVal, consumptionUnit: aiUnit || 'kWh' };
    }
  }

  if (!Array.isArray(linesRaw)) {
    return { consumptionValue: null, consumptionUnit: 'kWh' };
  }
  const physical = linesRaw
    .map((l) => l as Record<string, unknown>)
    .filter((l) => {
      const unit = String(l['unit'] ?? '').toLowerCase();
      return unit && unit !== 'eur' && unit !== 'usd';
    });
  if (physical.length === 0) {
    return { consumptionValue: null, consumptionUnit: 'kWh' };
  }
  const sum = physical.reduce((acc, l) => {
    const n = Number.parseFloat(String(l['value'] ?? '0'));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
  const unit = String(physical[0]['unit'] ?? 'kWh');
  return { consumptionValue: sum, consumptionUnit: unit };
}
