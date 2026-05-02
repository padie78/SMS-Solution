import {
  Component,
  Input,
  OnInit,
  inject,
  OnDestroy,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

import { PdfViewerModule } from 'ng2-pdf-viewer';

import type {
  InvoiceUpdatedGraphqlEvent,
  InvoiceUpdatedPayload
} from '../../../../core/models/api/appsync-api.models';
import type { ConfirmInvoiceInput } from '../../../../core/models/api/appsync-api.models';
import type { InvoiceReviewLine, InvoiceReviewView } from '../../../../core/models/invoice-review.model';
import type {
  HierarchyFieldKey,
  InvoiceAssignmentMeta,
  InvoiceHierarchySelection
} from '../../../../core/models/invoice-assignment.model';
import { emptyAssignmentMeta, emptyHierarchy } from '../../../../core/models/invoice-assignment.model';
import { InvoiceStateService } from '../../../../services/state/invoice-state.service';
import { AppSyncApiService } from '../../../../services/infrastructure/appsync-api.service';
import { NotificationService } from '../../../../services/ui/notification.service';
import { WorkflowStateService } from '../../../../services/state/workflow-state.service';
import { InvoiceAssetMatchingService } from '../../../../services/business/invoice-asset-matching.service';
import {
  INVOICE_COST_CENTER_OPTIONS,
  INVOICE_HIERARCHY_BRANCHES,
  INVOICE_HIERARCHY_BUILDINGS,
  INVOICE_HIERARCHY_REGIONS,
  assetOptionsForBuilding,
  meterOptionsForAsset,
  type HierarchyDropdownOption
} from '../../../../services/business/invoice-hierarchy-catalog';
import { UiSkeletonLineComponent } from '../../../../ui/atoms/ui-skeleton-line/ui-skeleton-line.component';

type InvoiceHierarchyFormGroup = FormGroup<{
  regionId: FormControl<string>;
  branchId: FormControl<string>;
  buildingId: FormControl<string>;
  assetId: FormControl<string>;
  meterId: FormControl<string>;
  costCenterId: FormControl<string>;
}>;

@Component({
  selector: 'app-invoice-validation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    DropdownModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
    ToastModule,
    PdfViewerModule,
    UiSkeletonLineComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.css']
})
export class InvoiceValidationComponent implements OnInit, OnDestroy {
  private readonly stateService = inject(InvoiceStateService);
  private readonly appsyncApi = inject(AppSyncApiService);
  private readonly notifications = inject(NotificationService);
  readonly workflow = inject(WorkflowStateService);
  private readonly matching = inject(InvoiceAssetMatchingService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Panel del stepper padre: extracción + matching vs solo revisión documental. */
  @Input() auditPanel: 'allocation' | 'invoice' = 'allocation';

  @Output() readonly onConfirm = new EventEmitter<void>();
  @Output() readonly onCancel = new EventEmitter<void>();
  /** Solo panel allocation: jerarquía completa → siguiente paso del stepper padre. */
  @Output() readonly onContinue = new EventEmitter<void>();

  isLoading = true;
  /** Resolver de jerarquía (Dynamo + catálogo local) */
  hierarchyResolving = false;
  errorMessage: string | null = null;
  invoice: InvoiceReviewView | null = null;

  pdfSrc: string | Uint8Array | null = null;
  zoom = 1.0;

  /** Desbloquea combos tras match automático */
  correctionMode = false;

  readonly regions: HierarchyDropdownOption[] = INVOICE_HIERARCHY_REGIONS;
  filteredBranches: Array<HierarchyDropdownOption & { regionId: string }> = [];
  filteredBuildings: Array<HierarchyDropdownOption & { branchId: string }> = [];
  filteredAssets: HierarchyDropdownOption[] = [];
  filteredMeters: HierarchyDropdownOption[] = [];
  filteredCostCenters: Array<HierarchyDropdownOption & { buildingIds: readonly string[] }> = [];

  hierarchyForm: InvoiceHierarchyFormGroup = this.fb.group({
    regionId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    branchId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    buildingId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    assetId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    meterId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    costCenterId: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  private pdfObjectUrl: string | null = null;
  private statusSubscription?: Subscription;
  private readonly hierarchySubs = new Subscription();
  private patchingFromResolver = false;

  get assignmentMeta(): InvoiceAssignmentMeta {
    return this.stateService.getSnapshot().assignmentMeta;
  }

  get invoiceLines(): InvoiceReviewLine[] {
    return this.invoice?.lines ?? [];
  }

  /** Taxes & fees are typically EUR lines or lines with 0 physical value. */
  get taxLines(): InvoiceReviewLine[] {
    const lines = this.invoice?.lines ?? [];
    return lines.filter((l) => {
      const unit = l.unit.toLowerCase();
      const v = Number.parseFloat(l.value);
      return unit === 'eur' || Number.isFinite(v) && v === 0;
    });
  }

  get usageLines(): InvoiceReviewLine[] {
    const lines = this.invoice?.lines ?? [];
    const taxSet = new Set(this.taxLines);
    return lines.filter((l) => !taxSet.has(l));
  }

  ngOnInit(): void {
    this.wireHierarchyForm();
    const snapshot = this.stateService.getSnapshot();

    if (snapshot.file) {
      void this.loadPdf(snapshot.file);
    } else {
      console.warn('No se encontró archivo en el snapshot');
      this.errorMessage = 'No se encontró archivo en el snapshot';
      this.isLoading = false;
      this.workflow.setPhase('error');
    }

    if (snapshot.extractedData) {
      this.invoice = snapshot.extractedData;
      this.isLoading = false;
      if (this.auditPanel === 'allocation') {
        void this.runHierarchyResolution(snapshot.extractedData);
      } else {
        this.patchHierarchyForm(snapshot.hierarchy);
        this.syncHierarchyLocks();
        this.workflow.setPhase('ready_for_review');
      }
      this.cdr.markForCheck();
      return;
    }

    const currentId = snapshot.invoiceId;
    if (currentId) {
      if (this.auditPanel === 'invoice') {
        this.errorMessage =
          'Los datos de la factura no están disponibles. Vuelve al paso anterior o espera la extracción.';
        this.isLoading = false;
        this.workflow.setPhase('error');
        this.cdr.markForCheck();
        return;
      }
      this.workflow.setPhase('awaiting_ai');
      this.subscribeToUpdates(currentId);
    } else {
      this.errorMessage = 'No se encontró una referencia válida para procesar.';
      this.isLoading = false;
      this.workflow.setPhase('error');
    }
  }

  private async loadPdf(file: File): Promise<void> {
    try {
      if (this.pdfObjectUrl) {
        URL.revokeObjectURL(this.pdfObjectUrl);
        this.pdfObjectUrl = null;
      }
      this.pdfObjectUrl = URL.createObjectURL(file);
      this.pdfSrc = this.pdfObjectUrl;
      this.cdr.markForCheck();
    } catch (e) {
      console.error('No se pudo cargar PDF', e);
      this.cdr.markForCheck();
    }
  }

  private subscribeToUpdates(id: string): void {
    this.statusSubscription = this.appsyncApi.onInvoiceUpdated(id).subscribe({
      next: (response: InvoiceUpdatedGraphqlEvent) => {
        const updated = this.pickInvoiceUpdatedPayload(response);
        if (!updated) return;

        const statusNorm = String(updated.status ?? '').toUpperCase();

        if (statusNorm === 'FAILED') {
          this.isLoading = false;
          this.errorMessage = 'El procesamiento de la factura falló (estado FAILED).';
          this.workflow.setPhase('error');
          this.cdr.markForCheck();
          this.statusSubscription?.unsubscribe();
          return;
        }

        if (statusNorm !== 'READY_FOR_REVIEW') {
          return;
        }

        try {
          const parsedData = this.parseExtractedData(updated.extractedData);
          this.invoice = this.buildInvoiceReview(parsedData);
          this.stateService.setAiData(this.invoice);
          this.isLoading = false;
          void this.runHierarchyResolution(this.invoice);
          this.cdr.markForCheck();
          this.statusSubscription?.unsubscribe();
        } catch (e) {
          console.error('Error en el parseo:', e);
          this.isLoading = false;
          this.workflow.setPhase('error');
          this.cdr.markForCheck();
        }
      },
      error: (err: unknown) => {
        console.error('Error en suscripción:', err);
        this.isLoading = false;
        this.workflow.setPhase('error');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Amplify AppSync RealTime hace `observer.next(payload)` con `{ data: { onInvoiceUpdated } }`.
   * Mantén también `value.data` por compatibilidad con versiones / wrappers.
   */
  private pickInvoiceUpdatedPayload(response: InvoiceUpdatedGraphqlEvent): InvoiceUpdatedPayload | undefined {
    const root = response as unknown as {
      data?: { onInvoiceUpdated?: InvoiceUpdatedPayload };
      value?: { data?: { onInvoiceUpdated?: InvoiceUpdatedPayload } };
    };
    return (
      root.data?.onInvoiceUpdated ??
      root.value?.data?.onInvoiceUpdated ??
      response.data?.onInvoiceUpdated ??
      response.value?.data?.onInvoiceUpdated
    );
  }

  isAiHighlighted(field: HierarchyFieldKey): boolean {
    return !!this.assignmentMeta.aiDetectedFieldMask[field];
  }

  enableCorrection(): void {
    this.correctionMode = true;
    this.stateService.patchAssignmentMeta({
      hierarchyLocked: false,
      requiresExternalIdentifierPersist: true
    });
    this.workflow.setIdentificationMode('user_correcting');
    this.syncHierarchyLocks();
    this.cdr.markForCheck();
  }

  get hierarchyReady(): boolean {
    const raw = this.hierarchyForm.getRawValue() as InvoiceHierarchySelection;
    return !!(
      raw.regionId.trim() &&
      raw.branchId.trim() &&
      raw.buildingId.trim() &&
      raw.assetId.trim() &&
      raw.meterId.trim() &&
      raw.costCenterId.trim()
    );
  }

  emitContinue(): void {
    if (!this.invoice || this.hierarchyResolving || !this.hierarchyReady) {
      return;
    }
    this.onContinue.emit();
  }

  tierLabel(): string {
    const t = this.assignmentMeta.matchTier;
    switch (t) {
      case 'cups':
        return 'CUPS';
      case 'meter_serial':
        return 'Meter serial';
      case 'contract_reference':
        return 'Contract / account ref.';
      case 'holder_address':
        return 'Holder + address';
      default:
        return '—';
    }
  }

  private wireHierarchyForm(): void {
    this.hierarchySubs.add(
      this.hierarchyForm.valueChanges.subscribe(() => {
        if (this.patchingFromResolver) return;
        const v = this.hierarchyForm.getRawValue() as InvoiceHierarchySelection;
        this.stateService.patchHierarchy(v);
        const meta = this.stateService.getSnapshot().assignmentMeta;
        if (meta.source === 'ai_resolved' && !this.correctionMode) return;
        this.stateService.patchAssignmentMeta({
          source: 'user_manual',
          requiresExternalIdentifierPersist: true
        });
      })
    );

    this.hierarchySubs.add(
      this.hierarchyForm.controls.regionId.valueChanges.subscribe((rid) => {
        if (this.patchingFromResolver) return;
        this.hierarchyForm.patchValue(
          { branchId: '', buildingId: '', assetId: '', meterId: '', costCenterId: '' },
          { emitEvent: false }
        );
        this.filteredBranches = rid ? INVOICE_HIERARCHY_BRANCHES.filter((b) => b.regionId === rid) : [];
        this.filteredBuildings = [];
        this.filteredAssets = [];
        this.filteredMeters = [];
        this.filteredCostCenters = [];
        this.cdr.markForCheck();
      })
    );

    this.hierarchySubs.add(
      this.hierarchyForm.controls.branchId.valueChanges.subscribe((bid) => {
        if (this.patchingFromResolver) return;
        this.hierarchyForm.patchValue(
          { buildingId: '', assetId: '', meterId: '', costCenterId: '' },
          { emitEvent: false }
        );
        this.filteredBuildings = bid ? INVOICE_HIERARCHY_BUILDINGS.filter((b) => b.branchId === bid) : [];
        this.filteredAssets = [];
        this.filteredMeters = [];
        this.filteredCostCenters = [];
        this.cdr.markForCheck();
      })
    );

    this.hierarchySubs.add(
      this.hierarchyForm.controls.buildingId.valueChanges.subscribe((bld) => {
        if (this.patchingFromResolver) return;
        this.hierarchyForm.patchValue({ assetId: '', meterId: '', costCenterId: '' }, { emitEvent: false });
        this.filteredAssets = bld ? assetOptionsForBuilding(bld) : [];
        this.filteredMeters = [];
        this.filteredCostCenters = this.costCentersForBuilding(bld);
        this.cdr.markForCheck();
      })
    );

    this.hierarchySubs.add(
      this.hierarchyForm.controls.assetId.valueChanges.subscribe((aid) => {
        if (this.patchingFromResolver) return;
        this.hierarchyForm.patchValue({ meterId: '', costCenterId: '' }, { emitEvent: false });
        const bld = this.hierarchyForm.controls.buildingId.value;
        this.filteredMeters = aid ? meterOptionsForAsset(aid) : [];
        this.filteredCostCenters = this.costCentersForBuilding(bld);
        this.cdr.markForCheck();
      })
    );

    this.hierarchySubs.add(
      this.hierarchyForm.controls.meterId.valueChanges.subscribe(() => {
        if (this.patchingFromResolver) return;
        const bld = this.hierarchyForm.controls.buildingId.value;
        this.filteredCostCenters = this.costCentersForBuilding(bld);
        this.cdr.markForCheck();
      })
    );
  }

  private costCentersForBuilding(
    buildingId: string
  ): Array<HierarchyDropdownOption & { buildingIds: readonly string[] }> {
    if (!buildingId) return [];
    return INVOICE_COST_CENTER_OPTIONS.filter(
      (cc) => cc.buildingIds.length === 0 || cc.buildingIds.includes(buildingId)
    );
  }

  private patchHierarchyForm(h: InvoiceHierarchySelection): void {
    this.patchingFromResolver = true;
    this.hierarchyForm.patchValue({ ...h }, { emitEvent: false });
    this.filteredBranches = h.regionId
      ? INVOICE_HIERARCHY_BRANCHES.filter((b) => b.regionId === h.regionId)
      : [];
    this.filteredBuildings = h.branchId
      ? INVOICE_HIERARCHY_BUILDINGS.filter((b) => b.branchId === h.branchId)
      : [];
    this.filteredAssets = h.buildingId ? assetOptionsForBuilding(h.buildingId) : [];
    this.filteredMeters = h.assetId ? meterOptionsForAsset(h.assetId) : [];
    this.filteredCostCenters = this.costCentersForBuilding(h.buildingId);
    this.patchingFromResolver = false;
    this.cdr.markForCheck();
  }

  private buildAiMask(h: InvoiceHierarchySelection): Partial<Record<HierarchyFieldKey, boolean>> {
    const keys: HierarchyFieldKey[] = [
      'regionId',
      'branchId',
      'buildingId',
      'assetId',
      'meterId',
      'costCenterId'
    ];
    const mask: Partial<Record<HierarchyFieldKey, boolean>> = {};
    for (const k of keys) {
      const val = h[k];
      if (typeof val === 'string' && val.trim()) mask[k] = true;
    }
    return mask;
  }

  private syncHierarchyLocks(): void {
    const locked = this.stateService.getSnapshot().assignmentMeta.hierarchyLocked && !this.correctionMode;
    if (locked) {
      this.hierarchyForm.disable({ emitEvent: false });
    } else {
      this.hierarchyForm.enable({ emitEvent: false });
    }
    this.cdr.markForCheck();
  }

  private async runHierarchyResolution(inv: InvoiceReviewView): Promise<void> {
    this.hierarchyResolving = true;
    this.workflow.setPhase('identifying_asset');
    this.correctionMode = false;
    this.cdr.markForCheck();

    try {
      const result = await this.matching.resolve(inv);
      const merged: InvoiceHierarchySelection = { ...emptyHierarchy(), ...(result.hierarchy ?? {}) };
      const hasAny = Object.values(merged).some((v) => !!String(v ?? '').trim());

      if (hasAny && result.matchTier !== 'none') {
        this.stateService.replaceHierarchy(merged);
        this.stateService.patchAssignmentMeta({
          source: 'ai_resolved',
          matchTier: result.matchTier,
          aiDetectedFieldMask: this.buildAiMask(merged),
          hierarchyLocked: true,
          requiresExternalIdentifierPersist: false
        });
        this.workflow.setIdentificationMode('auto_matched');
        this.patchHierarchyForm(merged);
      } else {
        this.stateService.replaceHierarchy(emptyHierarchy());
        this.stateService.patchAssignmentMeta({
          ...emptyAssignmentMeta(),
          source: 'none',
          hierarchyLocked: false,
          requiresExternalIdentifierPersist: true
        });
        this.workflow.setIdentificationMode('exception');
        this.patchHierarchyForm(emptyHierarchy());
      }
    } finally {
      this.hierarchyResolving = false;
      this.workflow.setPhase('ready_for_review');
      this.syncHierarchyLocks();
      this.cdr.markForCheck();
    }
  }

  /** Normaliza AWSJSON devuelto por AppSync (objeto, string JSON o string doblemente codificado). */
  private parseExtractedData(raw: unknown): Record<string, unknown> {
    if (raw == null) {
      return {};
    }
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
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

    // Solo formato tipo key=value (no intentar sobre JSON roto para evitar falsos positivos).
    if (!normalized.includes('{') && normalized.includes('=')) {
      return this.parseFlexibleString(normalized);
    }

    return {};
  }

  private normalizeExtractedDataString(raw: string): string {
    let s = raw.replace(/^\uFEFF/, '').trim();
    const fenced = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/im.exec(s);
    if (fenced?.[1]) {
      s = fenced[1].trim();
    }
    return s;
  }

  /** Si el payload llega como string JSON con comillas externas (`"{...}"`). */
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

  /**
   * Literal tipo Java/AppSync Map mal serializado: `{vendor=Acme, total_amount=12.3}`.
   * Ocurre cuando el VTL interpolaba `$context.arguments.extractedData` entre comillas.
   */
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

  /** Primer objeto `{ ... }` balanceado respecto a strings JSON (comillas y escapes). */
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

  /**
   * Attempts to repair a JSON-like string into valid JSON:
   * - Quotes unquoted keys: { vendor: 'X' } -> { "vendor": 'X' }
   * - Converts single-quoted strings to double quotes (best effort)
   * - Removes trailing commas
   */
  private repairJsonLike(candidate: string): string {
    let s = candidate.trim();
    // Remove trailing commas before } or ]
    s = s.replace(/,\s*([}\]])/g, '$1');
    // Quote object keys when missing quotes
    s = s.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
    // Convert single-quoted strings to double-quoted strings (best effort)
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

  private buildInvoiceReview(parsed: Record<string, unknown>): InvoiceReviewView {
    const vendorRaw = parsed['vendor'];
    let totalAmountRaw: unknown = parsed['total_amount'];
    const netAmountRaw = parsed['net_amount'];
    const taxAmountRaw = parsed['tax_amount'];
    const currencyRaw = parsed['currency'];
    const billing = parsed['billing_period'] as Record<string, unknown> | undefined;
    const invoiceNumberRaw = parsed['invoice_number'];
    const invoiceDateRaw = parsed['invoice_date'];
    const cupsRaw = parsed['cups'];
    const meterSerialRaw =
      parsed['meter_serial_number'] ?? parsed['meterSerialNumber'] ?? parsed['meter_serial'];
    const contractRefRaw = parsed['contract_reference'];
    const holderTaxRaw = parsed['holder_tax_id'] ?? parsed['holderTaxId'] ?? parsed['cif'];
    const supplyAddressRaw =
      parsed['supply_address'] ?? parsed['supplyAddress'] ?? parsed['service_address'];
    const tariffRaw = parsed['tariff'];

    const vendor =
      typeof vendorRaw === 'string'
        ? vendorRaw
        : vendorRaw && typeof vendorRaw === 'object' && !Array.isArray(vendorRaw)
          ? String((vendorRaw as Record<string, unknown>)['name'] ?? 'No detectado')
          : 'No detectado';

    if (
      totalAmountRaw &&
      typeof totalAmountRaw === 'object' &&
      !Array.isArray(totalAmountRaw)
    ) {
      const ta = totalAmountRaw as Record<string, unknown>;
      totalAmountRaw =
        ta['total_with_tax'] ?? ta['total'] ?? ta['net_amount'] ?? ta['amount'] ?? 0;
    }

    const total =
      typeof totalAmountRaw === 'string'
        ? parseFloat(totalAmountRaw)
        : Number(totalAmountRaw) || 0;
    const netAmount =
      typeof netAmountRaw === 'string'
        ? parseFloat(netAmountRaw)
        : netAmountRaw != null
          ? Number(netAmountRaw)
          : undefined;
    const taxAmount =
      typeof taxAmountRaw === 'string'
        ? parseFloat(taxAmountRaw)
        : taxAmountRaw != null
          ? Number(taxAmountRaw)
          : undefined;
    const currency = typeof currencyRaw === 'string' ? currencyRaw : 'EUR';
    const billingStart = billing && typeof billing['start'] === 'string' ? (billing['start'] as string) : '';
    const billingEnd = billing && typeof billing['end'] === 'string' ? (billing['end'] as string) : '';
    const date =
      billingEnd
        ? billingEnd
        : typeof parsed['date'] === 'string'
          ? (parsed['date'] as string)
          : '';

    const linesRaw = parsed['lines'] ?? parsed['invoice_lines'] ?? parsed['emission_lines'];
    const lines: InvoiceReviewLine[] = Array.isArray(linesRaw)
      ? linesRaw.map((line: unknown) => {
          const l = line as Record<string, unknown>;
          const descRaw = l['description'];
          const desc = typeof descRaw === 'string' ? descRaw : String(descRaw ?? '');
          const value = String(l['value'] ?? '');
          const unit = String(l['unit'] ?? '');
          const costRaw = l['monetary_cost'];
          const monetary_cost =
            typeof costRaw === 'number' ? costRaw : Number.parseFloat(String(costRaw ?? '0')) || 0;
          return { description: desc, value, unit, monetary_cost };
        })
      : [];

    const consumption = lines
      .filter((l) => l.unit.toLowerCase().includes('kwh'))
      .reduce((acc, curr) => acc + (Number.parseFloat(curr.value) || 0), 0);

    return {
      vendor,
      invoiceNumber: typeof invoiceNumberRaw === 'string' ? invoiceNumberRaw : undefined,
      invoiceDate: typeof invoiceDateRaw === 'string' ? invoiceDateRaw : undefined,
      cups: typeof cupsRaw === 'string' ? cupsRaw : undefined,
      meterSerialNumber: typeof meterSerialRaw === 'string' ? meterSerialRaw : undefined,
      contractReference: typeof contractRefRaw === 'string' ? contractRefRaw : undefined,
      holderTaxId: typeof holderTaxRaw === 'string' ? holderTaxRaw : undefined,
      supplyAddress: typeof supplyAddressRaw === 'string' ? supplyAddressRaw : undefined,
      tariff: typeof tariffRaw === 'string' ? tariffRaw : undefined,
      total,
      netAmount: Number.isFinite(netAmount as number) ? (netAmount as number) : undefined,
      taxAmount: Number.isFinite(taxAmount as number) ? (taxAmount as number) : undefined,
      currency,
      date,
      billingPeriodStart: billingStart || undefined,
      billingPeriodEnd: billingEnd || undefined,
      consumption,
      lines,
      confidence: 90
    };
  }

  async handleConfirm(): Promise<void> {
    if (!this.invoice) {
      return;
    }

    const raw = this.hierarchyForm.getRawValue() as InvoiceHierarchySelection;
    const hierarchyOk =
      raw.regionId.trim() &&
      raw.branchId.trim() &&
      raw.buildingId.trim() &&
      raw.assetId.trim() &&
      raw.meterId.trim() &&
      raw.costCenterId.trim();

    if (!hierarchyOk) {
      this.notifications.error('Jerarquía incompleta', 'Selecciona región, sucursal, edificio, activo, medidor y centro de costo.');
      return;
    }

    const backup: InvoiceReviewView = { ...this.invoice, lines: [...this.invoice.lines] };
    this.isLoading = true;
    this.workflow.setPhase('confirming');

    try {
      this.stateService.replaceHierarchy(raw);

      const snapshot = this.stateService.getSnapshot();
      const invoiceId = snapshot.invoiceId;
      if (!invoiceId) {
        throw new Error('ID de factura no válido.');
      }

      if (snapshot.assignmentMeta.requiresExternalIdentifierPersist && snapshot.hierarchy.assetId) {
        const linkResult = await this.appsyncApi.linkAssetExternalIdentifier(snapshot.hierarchy.assetId, {
          cups: this.invoice.cups,
          meterSerialNumber: this.invoice.meterSerialNumber,
          contractReference: this.invoice.contractReference,
          holderTaxId: this.invoice.holderTaxId,
          supplyAddress: this.invoice.supplyAddress
        });
        if (!linkResult.success) {
          throw new Error(linkResult.message ?? 'No se pudieron persistir los identificadores externos.');
        }
        this.stateService.patchAssignmentMeta({ requiresExternalIdentifierPersist: false });
      }

      const confirmInput: ConfirmInvoiceInput = {
        status: 'CONFIRMED',
        extracted_data: JSON.stringify(this.invoice),
        buildingId: snapshot.hierarchy.buildingId,
        meterId: snapshot.hierarchy.meterId,
        costCenterId: snapshot.hierarchy.costCenterId,
        notes: snapshot.internalNote,
        regionId: snapshot.hierarchy.regionId,
        branchId: snapshot.hierarchy.branchId,
        assetId: snapshot.hierarchy.assetId
      };

      const result = await this.appsyncApi.confirmInvoice(invoiceId, confirmInput);

      if (result.success) {
        this.workflow.setPhase('confirmed');
        this.notifications.success('Confirmado', 'Factura validada correctamente.');
        setTimeout(() => this.onConfirm.emit(), 600);
      } else {
        throw new Error(result.message);
      }
    } catch (err: unknown) {
      this.invoice = backup;
      this.workflow.setPhase('error');
      const message = err instanceof Error ? err.message : 'Error al confirmar';
      this.notifications.error('Error', message);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  goBack(): void {
    this.onCancel.emit();
  }

  ngOnDestroy(): void {
    this.statusSubscription?.unsubscribe();
    this.hierarchySubs.unsubscribe();
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
      this.pdfObjectUrl = null;
    }
  }
}
