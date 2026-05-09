import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import type { SmsLocationNode, SmsLocationNodeType } from '../../../core/models/sms-location-node.model';
import { LocationStatusBadgeComponent } from '../../atoms/location-status-badge/location-status-badge.component';

interface NameSegment {
  readonly text: string;
  readonly matched: boolean;
}

/**
 * Color base del ícono del nodo. Estandarizado en `slate-500` para TODOS
 * los tipos: el tipo se comunica por la forma del ícono (`pi pi-building`,
 * `pi pi-globe`, `pi pi-map-marker`, ...), no por el color. En estado
 * seleccionado todos los íconos pasan a esmeralda (regla global en
 * `styles.css`).
 */
const NODE_ICON_COLOR = 'text-slate-500';

/** Semántica visual del badge KPI: coincide con estado operativo / carga / anomalías. */
type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

type ValueBadge = { label: string; tone: BadgeTone; icon: string };

function kpiIconForNodeType(t: SmsLocationNodeType | undefined): string {
  switch (t) {
    case 'ORGANIZATION':
      return 'pi pi-building';
    case 'REGION':
      return 'pi pi-globe';
    case 'BRANCH':
      return 'pi pi-map-marker';
    case 'BUILDING':
      return 'pi pi-warehouse';
    case 'COST_CENTER':
      return 'pi pi-wallet';
    case 'ASSET':
      return 'pi pi-box';
    case 'METER':
      return 'pi pi-bolt';
    default:
      return 'pi pi-chart-bar';
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' ? (v as Record<string, unknown>) : {}) as Record<string, unknown>;
}

function readString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function readNumber(meta: Record<string, unknown>, key: string): number | null {
  const v = meta[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function readBool(meta: Record<string, unknown>, key: string): boolean | null {
  const v = meta[key];
  return typeof v === 'boolean' ? v : null;
}

function compactCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${Math.round(n)}`;
}

const BAD_ASSET_STATUS = new Set(['DOWN', 'FAULT', 'OFFLINE', 'DECOMMISSIONED', 'BROKEN', 'INACTIVE']);
const BAD_METER_STATUS = new Set(['OFFLINE', 'FAULT', 'ERROR', 'INACTIVE', 'STALE']);

function daysSince(iso: string | null | undefined): number | null {
  if (!iso || typeof iso !== 'string') return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 86_400_000;
}

function maxTone(a: BadgeTone, b: BadgeTone): BadgeTone {
  const rank: Record<BadgeTone, number> = { neutral: 0, success: 1, warning: 2, danger: 3 };
  return rank[a] >= rank[b] ? a : b;
}

@Component({
  selector: 'sms-tree-node-template',
  standalone: true,
  imports: [CommonModule, TooltipModule, LocationStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      /*
       * Altura estable del row: previene "salto" vertical cuando aparecen
       * las quick actions al hacer hover (los botones son más altos que el
       * ícono/badge sueltos). Reservamos ese alto siempre.
       */
      /* Una sola fila, ancho completo; sin wrap (el texto trunca con ellipsis). */
      .row {
        width: 100%;
        min-width: 0;
        min-height: 1.5rem;
        padding: 0.1rem 0.25rem;
        flex-wrap: nowrap;
      }

      .node-body {
        min-width: 0;
        flex-wrap: nowrap;
        justify-content: flex-start;
      }

      /*
       * Sin flex-grow en el título: el chip KPI queda pegado al final del texto,
       * no al borde derecho del panel (el hueco libre queda antes del bloque QA).
       */
      .title {
        flex: 0 1 auto;
        line-height: 1.2;
        max-width: 100%;
      }

      /* Highlight de coincidencias del filtro global. */
      .match {
        background: rgba(254, 240, 138, 0.9); /* yellow-200 */
        color: rgb(120 53 15); /* amber-900 */
        border-radius: 0.25rem;
        padding: 0 0.15rem;
      }

      /* Conteo de hijos: mini chip con ícono jerárquico (complementa el KPI). */
      .sms-count-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        height: 1.15rem;
        padding: 0 0.38rem;
        border-radius: 999px;
        font-size: 0.6rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        color: rgb(71 85 105);
        background: linear-gradient(180deg, rgb(255 255 255) 0%, rgb(248 250 252) 100%);
        border: 1px solid rgb(226 232 240);
        box-shadow: 0 1px 1px rgba(15, 23, 42, 0.05);
      }

      .sms-count-chip__ico {
        font-size: 0.55rem;
        opacity: 0.85;
      }

      :host-context(.p-treenode-content.p-highlight) .sms-count-chip {
        color: rgb(6 95 70);
        background: linear-gradient(180deg, rgb(236 253 245) 0%, rgb(209 250 229) 100%);
        border-color: rgba(16, 185, 129, 0.35);
      }

      /* Chip KPI (reemplaza p-badge): icono + métrica, “glass” y elevación al hover. */
      .sms-kpi-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.28rem;
        height: 1.28rem;
        padding: 0 0.45rem 0 0.38rem;
        border-radius: 0.5rem;
        font-size: 0.625rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: none;
        font-variant-numeric: tabular-nums;
        cursor: default;
        user-select: none;
        vertical-align: middle;
        border: 1px solid transparent;
        box-shadow:
          0 1px 2px rgba(15, 23, 42, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.45);
        background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0) 55%);
        transition:
          transform 140ms ease,
          box-shadow 140ms ease,
          filter 140ms ease;
      }

      .row:hover .sms-kpi-chip {
        transform: translateY(-0.5px);
        box-shadow:
          0 2px 6px rgba(15, 23, 42, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.55);
      }

      .sms-kpi-chip__ico {
        font-size: 0.6rem;
        line-height: 1;
        opacity: 0.92;
        filter: drop-shadow(0 0.5px 0 rgba(255, 255, 255, 0.35));
      }

      .sms-kpi-chip__txt {
        max-width: 6.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sms-kpi-chip--success {
        color: rgb(6 78 59);
        background-color: rgba(16, 185, 129, 0.2);
        border-color: rgba(16, 185, 129, 0.38);
      }

      .sms-kpi-chip--warning {
        color: rgb(120 53 15);
        background-color: rgba(251, 191, 36, 0.28);
        border-color: rgba(245, 158, 11, 0.55);
      }

      .sms-kpi-chip--danger {
        color: rgb(127 29 29);
        background-color: rgba(252, 165, 165, 0.35);
        border-color: rgba(239, 68, 68, 0.48);
      }

      .sms-kpi-chip--neutral {
        color: rgb(51 65 85);
        background-color: rgba(241, 245, 249, 0.95);
        border-color: rgba(203, 213, 225, 0.95);
      }

      :host-context(.p-treenode-content.p-highlight) .sms-kpi-chip--success {
        background-color: rgba(16, 185, 129, 0.26);
        border-color: rgba(5, 150, 105, 0.42);
      }

      :host-context(.p-treenode-content.p-highlight) .sms-kpi-chip--warning {
        background-color: rgba(251, 191, 36, 0.34);
      }

      :host-context(.p-treenode-content.p-highlight) .sms-kpi-chip--danger {
        background-color: rgba(252, 165, 165, 0.42);
      }

      :host-context(.p-treenode-content.p-highlight) .sms-kpi-chip--neutral {
        background-color: rgb(226 232 240);
      }

      .sms-kpi-chip--danger .sms-kpi-chip__ico {
        animation: sms-kpi-pulse 2.4s ease-in-out infinite;
      }

      @keyframes sms-kpi-pulse {
        0%,
        100% {
          opacity: 0.92;
        }
        50% {
          opacity: 0.55;
        }
      }

      /*
       * Quick actions: ocultos hasta que el usuario hace hover sobre el nodo.
       * Usamos display:none (no opacity:0 + pointer-events:none) porque
       * con display:none no hay riesgo de "click fantasma" cuando el botón
       * recién se vuelve visible. La visibilidad la dispara la clase qa-show
       * que setea el HostListener (mouseenter/mouseleave).
       */
      .qa {
        display: none;
      }

      .qa.qa-show,
      :host-context(.p-treenode-content.p-highlight) .qa {
        display: inline-flex;
      }

      .qa-btn {
        width: 1.3rem;
        height: 1.3rem;
        padding: 0;
        line-height: 1;
        border-radius: 0.45rem;
        border: 1px solid transparent;
        background: transparent;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 120ms ease, border-color 120ms ease;
      }

      .qa-btn:hover {
        background: rgb(248 250 252);
        border-color: rgb(226 232 240);
      }

      .qa-btn:active {
        background: rgb(241 245 249);
      }

      .qa-btn .pi {
        display: block;
        line-height: 1;
      }
    `
  ],
  template: `
    <div class="row group flex align-items-center w-full min-w-0 flex-nowrap gap-2">
      <i
        [ngClass]="iconClasses"
        class="node-icon shrink-0 text-sm"
        aria-hidden="true"
      ></i>

      <div class="node-body flex flex-1 min-w-0 align-items-center gap-1.5">
        <span
          class="title min-w-0 grow-0 shrink overflow-hidden text-overflow-ellipsis white-space-nowrap text-[13px] font-semibold text-slate-800"
        >
          <ng-container *ngFor="let segment of nameSegments">
            <span [class.match]="segment.matched">{{ segment.text }}</span>
          </ng-container>
        </span>

        <span
          *ngIf="valueBadge as b"
          class="sms-kpi-chip shrink-0"
          [ngClass]="'sms-kpi-chip--' + b.tone"
          tabindex="-1"
          role="img"
          [attr.aria-label]="'Indicador: ' + b.label"
        >
          <i class="sms-kpi-chip__ico" [ngClass]="b.icon" aria-hidden="true"></i>
          <span class="sms-kpi-chip__txt">{{ b.label }}</span>
        </span>

        <span
          *ngIf="childCountLabel"
          class="sms-count-chip shrink-0"
          [pTooltip]="childCountTooltip"
          tooltipPosition="top"
          tooltipStyleClass="sms-tree-tooltip"
          appendTo="body"
          [showDelay]="200"
          tabindex="-1"
          role="img"
          [attr.aria-label]="childCountTooltip"
        >
          <i class="sms-count-chip__ico pi pi-share-alt" aria-hidden="true"></i>
          {{ childCountLabel }}
        </span>
        <sms-status-badge *ngIf="showStatusBadge" class="shrink-0" [status]="node.status" />
      </div>

      <div
        class="qa ml-auto shrink-0 align-items-center gap-1 flex-nowrap"
        [class.qa-show]="hovered"
        aria-label="Acciones rápidas"
      >
        <button
          type="button"
          class="qa-btn"
          (click)="onCreateChild($event)"
          aria-label="Crear hijo"
        >
          <i class="pi pi-plus text-xs text-slate-600" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="qa-btn"
          (click)="onEdit($event)"
          aria-label="Editar"
        >
          <i class="pi pi-pencil text-xs text-slate-600" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="qa-btn"
          (click)="onDelete($event)"
          aria-label="Eliminar"
        >
          <i class="pi pi-trash text-xs text-rose-600" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `
})
export class LocationTreeNodeTemplateComponent {
  @Input({ required: true }) node!: SmsLocationNode;
  /** Texto del filtro global del árbol. Se usa para resaltar coincidencias en el nombre. */
  @Input() filterQuery: string | null | undefined = '';

  @Output() createChild = new EventEmitter<SmsLocationNode>();
  @Output() edit = new EventEmitter<SmsLocationNode>();
  @Output() delete = new EventEmitter<SmsLocationNode>();

  /**
   * Estado de hover para mostrar/ocultar las quick actions sin depender de
   * `:host-context`, que es frágil dentro de plantillas anidadas de p-tree.
   * Lo gestionamos con HostListener para que sea explícito y testeable.
   */
  hovered = false;
  private readonly cdr = inject(ChangeDetectorRef);

  @HostListener('mouseenter') onHostMouseEnter(): void {
    this.hovered = true;
    this.cdr.markForCheck();
  }

  @HostListener('mouseleave') onHostMouseLeave(): void {
    this.hovered = false;
    this.cdr.markForCheck();
  }

  get iconClasses(): string[] {
    const icon =
      typeof this.node.icon === 'string' && this.node.icon.trim().length > 0
        ? this.node.icon
        : 'pi pi-circle';
    return [...icon.split(' '), NODE_ICON_COLOR];
  }

  /**
   * Segmentos del nombre divididos por la coincidencia del filtro (case-insensitive).
   * Renderiza en el template como `<span [class.match]="...">`.
   */
  get nameSegments(): readonly NameSegment[] {
    const name = this.node.name ?? '';
    const q = (this.filterQuery ?? '').trim();
    if (q.length === 0 || name.length === 0) {
      return [{ text: name, matched: false }];
    }
    const out: NameSegment[] = [];
    const lower = name.toLowerCase();
    const lowerQ = q.toLowerCase();
    let cursor = 0;
    while (cursor < name.length) {
      const idx = lower.indexOf(lowerQ, cursor);
      if (idx === -1) {
        out.push({ text: name.slice(cursor), matched: false });
        break;
      }
      if (idx > cursor) {
        out.push({ text: name.slice(cursor, idx), matched: false });
      }
      out.push({ text: name.slice(idx, idx + lowerQ.length), matched: true });
      cursor = idx + lowerQ.length;
    }
    return out;
  }

  /**
   * Conteo de hijos directos cargados. Si el nodo es lazy y todavía no expandió,
   * devuelve `null` para no mostrar un número engañoso (0).
   */
  get childrenCount(): number | null {
    const len = this.node.children?.length ?? 0;
    return len > 0 ? len : null;
  }

  /**
   * True si el tipo de nodo puede contener hijos en la jerarquía SMS
   * (ORG → REGION → BRANCH → BUILDING → ASSET → METER).
   * `METER` y `COST_CENTER` son hojas y no muestran badge de conteo.
   */
  get canHaveChildren(): boolean {
    switch (this.node.type) {
      case 'ORGANIZATION':
      case 'REGION':
      case 'BRANCH':
      case 'BUILDING':
      case 'ASSET':
        return true;
      default:
        return false;
    }
  }

  /**
   * Tono del badge según estado del nodo, frescura de telemetría, jerarquía lazy
   * y completitud mínima de metadata (reglas heurísticas hasta tener KPI backend).
   */
  private computeHealthTone(): BadgeTone {
    let t: BadgeTone = 'success';
    const meta = asRecord(this.node.metadata);
    const st = (this.node.status ?? 'ACTIVE').toUpperCase();

    if (st === 'ALERT') return 'danger';
    if (st === 'MAINTENANCE') t = maxTone(t, 'warning');

    if (this.lazyChildrenPending) t = maxTone(t, 'warning');

    const lastAt = this.node.consumption_data?.lastUpdatedAt;
    const days = daysSince(lastAt);

    if (this.node.type === 'METER' || this.node.type === 'ASSET') {
      if (days === null) t = maxTone(t, 'warning');
      else if (days > 365) t = maxTone(t, 'danger');
      else if (days > 60) t = maxTone(t, 'warning');
    } else if (days !== null && days > 365) {
      t = maxTone(t, 'warning');
    }

    if (this.node.type === 'METER') {
      const mst = readString(meta, 'meterStatus');
      if (mst && BAD_METER_STATUS.has(mst.toUpperCase())) t = maxTone(t, 'danger');
      const sn = readString(meta, 'serialNumber');
      const cups = readString(meta, 'cups');
      const mtype = readString(meta, 'meterType');
      if (!sn && !cups && !mtype) t = maxTone(t, 'danger');
      else if (!sn && !cups) t = maxTone(t, 'warning');
    }

    if (this.node.type === 'ASSET') {
      const ast = readString(meta, 'assetStatus');
      if (ast && BAD_ASSET_STATUS.has(ast.toUpperCase())) t = maxTone(t, 'danger');
      const p =
        readNumber(meta, 'nominalPower_kw') ?? readNumber(meta, 'nominalPower');
      const at = readString(meta, 'assetType');
      if (!at && p === null) t = maxTone(t, 'warning');
    }

    if (this.node.type === 'REGION') {
      if (!readString(meta, 'countryCode') && !readString(meta, 'code')) {
        t = maxTone(t, 'warning');
      }
    }

    if (this.node.type === 'ORGANIZATION' && !readString(meta, 'code')) {
      t = maxTone(t, 'neutral');
    }

    if (this.node.type === 'BUILDING') {
      const op = readString(meta, 'operationalStatus')?.toUpperCase();
      if (op === 'CLOSED' || op === 'DECOMMISSIONED') t = maxTone(t, 'warning');
    }

    return t;
  }

  /** `true` si el árbol lazy aún no cargó hijos bajo este padre. */
  private get lazyChildrenPending(): boolean {
    return this.childCountLabel === '?';
  }

  /**
   * KPI + tono de color. Sin `pTooltip` en el chip: el detalle va en el tooltip
   * de la fila (árbol) para verde/amarillo/rojo por igual.
   */
  get valueBadge(): ValueBadge | null {
    const tone = this.computeHealthTone();

    const intrinsic = this.intrinsicValueBadge();
    if (intrinsic) {
      return {
        label: intrinsic.label,
        tone,
        icon: kpiIconForNodeType(this.node.type)
      };
    }

    if (tone === 'danger' || tone === 'warning') {
      return {
        label: tone === 'danger' ? '!' : '·',
        tone,
        icon: tone === 'danger' ? 'pi pi-times-circle' : 'pi pi-exclamation-circle'
      };
    }

    if (tone === 'neutral' && this.node.type === 'ORGANIZATION') {
      return {
        label: '···',
        tone: 'neutral',
        icon: 'pi pi-info-circle'
      };
    }

    return null;
  }

  /** Texto corto del chip KPI (sin tooltip duplicado del mismo dato). */
  private intrinsicValueBadge(): { label: string } | null {
    const meta = asRecord(this.node.metadata);

    switch (this.node.type) {
      case 'REGION': {
        const cc = readString(meta, 'countryCode');
        if (cc) return { label: cc.toUpperCase() };
        const code = readString(meta, 'code');
        if (code) return { label: code };
        return null;
      }
      case 'BRANCH': {
        const ft = readString(meta, 'facilityType');
        if (ft) return { label: ft };
        const hq = readBool(meta, 'isHeadquarters');
        if (hq === true) return { label: 'HQ' };
        return null;
      }
      case 'BUILDING': {
        const m2 = readNumber(meta, 'm2Surface');
        if (m2 !== null) return { label: `${m2.toLocaleString()} m²` };
        const year = readNumber(meta, 'yearBuilt');
        if (year !== null) return { label: `Año ${year}` };
        const usage = readString(meta, 'usageType');
        if (usage) return { label: usage };
        return null;
      }
      case 'COST_CENTER': {
        const budget = readNumber(meta, 'annualBudget');
        if (budget !== null) {
          const cur = readString(meta, 'currency') ?? 'USD';
          return {
            label: `${cur} ${compactCurrency(budget)}`
          };
        }
        const ext = readString(meta, 'externalId');
        if (ext) return { label: ext };
        return null;
      }
      case 'ASSET': {
        const pkw = readNumber(meta, 'nominalPower_kw');
        if (pkw !== null) return { label: `${pkw} kW` };
        const p = readNumber(meta, 'nominalPower');
        if (p !== null) return { label: `${p} kW` };
        const t = readString(meta, 'assetType');
        if (t) return { label: t };
        return null;
      }
      case 'METER': {
        const isMain = readBool(meta, 'isMain');
        if (isMain === true) return { label: 'Principal' };
        const mt = readString(meta, 'meterType');
        if (mt) return { label: mt };
        const sn = readString(meta, 'serialNumber');
        if (sn) return { label: `S/N ${sn}` };
        return null;
      }
      case 'ORGANIZATION': {
        const code = readString(meta, 'code');
        if (code) return { label: code };
        return null;
      }
      default:
        return null;
    }
  }

  /**
   * Conteo de hijos directos para el chip jerárquico.
   *
   * Aplica a todos los tipos de nodo padre (no sólo `BRANCH`):
   *  - Número exacto si los hijos están cargados (`children.length`).
   *  - `'?'` si el árbol es lazy, `hasChildren=true` y todavía no se expandió.
   *  - `'0'` si ya se sabe que no hay hijos (sin carga lazy pendiente).
   *  - Vacío sólo para hojas (`METER`, `COST_CENTER`).
   */
  get childCountLabel(): string {
    if (!this.canHaveChildren) return '';

    const fromChildren = this.node.children?.length ?? 0;
    if (fromChildren > 0) return String(fromChildren);

    const data = (this.node.data ?? {}) as { childCount?: number | null };
    if (typeof data.childCount === 'number' && data.childCount > 0) {
      return String(data.childCount);
    }

    if (this.node.hasChildren === true || data.childCount === null) return '?';

    return '0';
  }

  /**
   * Mostramos el badge de estado SOLO cuando el nodo NO está activo.
   * `ACTIVE` es el estado por defecto y no aporta info al usuario;
   * mostrarlo en cada fila genera ruido visual innecesario.
   */
  get showStatusBadge(): boolean {
    const status = this.node.status;
    if (!status) return false;
    return String(status).toUpperCase() !== 'ACTIVE';
  }

  /**
   * Texto explicativo del badge de conteo, leído por el `pTooltip` del
   * propio badge. Aclara la métrica para que no sea ambigua y, cuando
   * aplica, indica que el árbol es lazy ("expandí para cargar").
   */
  get childCountTooltip(): string {
    const label = this.childCountLabel;
    if (!label) return '';
    if (label === '?') {
      return 'Tiene hijos sin cargar — expandí el nodo para verlos';
    }
    if (label === '0') {
      return 'Sin hijos directos bajo este nodo';
    }
    return `${label} ${label === '1' ? 'hijo directo' : 'hijos directos'}`;
  }

  onCreateChild(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.createChild.emit(this.node);
  }

  onEdit(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.edit.emit(this.node);
  }

  onDelete(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.delete.emit(this.node);
  }
}
