import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Subscription } from 'rxjs';

import { StepsModule } from 'primeng/steps';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessagesModule } from 'primeng/messages';
import type { Message } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';

import {
  ENERGY_SERVICE_TYPE_I18N,
  ENTITY_TYPE_I18N,
  type EnergyServiceType,
  type EntityType,
  type EnergyServiceTypeI18nKey,
  type EntityTypeI18nKey,
  type InvoiceConfirmPayload
} from '@sms/common';

import { AppSyncApiService } from '../../../services/infrastructure/appsync-api.service';
import { S3StorageService } from '../../../services/infrastructure/s3-storage.service';
import { AuthService } from '../../../services/infrastructure/auth.service';
import { NotificationService } from '../../../services/ui/notification.service';
import {
  toInvoiceDynamoId,
  type InvoiceUpdatedGraphqlEvent,
  type InvoiceUpdatedPayload
} from '../../../core/models/api/appsync-api.models';
import {
  InvoiceExtractionParserService,
  mapParsedToExtractionFields
} from '../../../services/business/invoice-extraction-parser.service';

import {
  type InvoiceClassifyShape,
  type InvoiceExtractStateValue,
  type InvoiceExtractShape,
  type InvoiceTargetEntityType,
  type InvoiceWizardDropdownOption,
  type InvoiceWizardFormShape
} from './invoice-create-pro.types';
import { InvoiceIngestStepComponent } from './steps/invoice-ingest-step.component';
import { InvoiceExtractStepComponent } from './steps/invoice-extract-step.component';
import { InvoiceClassifyStepComponent } from './steps/invoice-classify-step.component';
import { InvoiceReviewStepComponent } from './steps/invoice-review-step.component';

const ALLOWED_TARGET_ENTITIES: ReadonlyArray<InvoiceTargetEntityType> = ['BUILDING', 'METER'];
const ALLOWED_SERVICE_TYPES: ReadonlyArray<EnergyServiceType> = ['ELECTRICITY', 'GAS', 'WATER', 'STEAM'];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

@Component({
  selector: 'app-invoice-create-pro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    StepsModule,
    ButtonModule,
    MessagesModule,
    ProgressSpinnerModule,
    TagModule,
    InvoiceIngestStepComponent,
    InvoiceExtractStepComponent,
    InvoiceClassifyStepComponent,
    InvoiceReviewStepComponent
  ],
  templateUrl: './invoice-create-pro.component.html',
  styleUrls: ['./invoice-create-pro.component.css']
})
export class InvoiceCreateProComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly appsync = inject(AppSyncApiService);
  private readonly s3 = inject(S3StorageService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly parser = inject(InvoiceExtractionParserService);

  /** Único FormGroup raíz que abarca los 4 pasos. */
  protected readonly form: FormGroup<InvoiceWizardFormShape> = new FormGroup<InvoiceWizardFormShape>({
    ingest: new FormControl<File | null>(null, { validators: [Validators.required] }),
    extract: new FormGroup<InvoiceExtractShape>({
      vendor: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(160)]
      }),
      vendorTaxId: new FormControl<string>('', { nonNullable: true }),
      invoiceNumber: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      invoiceDate: new FormControl<Date | null>(null, { validators: [Validators.required] }),
      billingPeriodStart: new FormControl<Date | null>(null),
      billingPeriodEnd: new FormControl<Date | null>(null),
      totalAmount: new FormControl<number | null>(null, { validators: [Validators.required] }),
      consumptionValue: new FormControl<number | null>(null, {
        validators: [Validators.required]
      }),
      consumptionUnit: new FormControl<string>('kWh', { nonNullable: true })
    }),
    classify: new FormGroup<InvoiceClassifyShape>({
      targetEntity: new FormControl<InvoiceTargetEntityType | null>(null, {
        validators: [Validators.required]
      }),
      assetId: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(64)]
      }),
      serviceType: new FormControl<EnergyServiceType | null>(null, {
        validators: [Validators.required]
      }),
      periodYear: new FormControl<number | null>(new Date().getFullYear(), {
        validators: [Validators.required, Validators.min(2000), Validators.max(2100)]
      }),
      periodMonth: new FormControl<number | null>(new Date().getMonth() + 1, {
        validators: [Validators.required, Validators.min(1), Validators.max(12)]
      })
    })
  });

  /** Estado UI reactivo basado en signals. */
  protected readonly activeStepIndex = signal<number>(0);
  protected readonly submitting = signal<boolean>(false);
  protected readonly errors = signal<Message[]>([]);

  /** Estado del flujo de extracción IA (Step 1). */
  protected readonly extractState = signal<InvoiceExtractStateValue>('idle');

  /** PDF en memoria como ObjectURL → SafeResourceUrl. */
  protected readonly pdfSafeUrl = signal<SafeResourceUrl | null>(null);
  private currentObjectUrl: string | null = null;

  /**
   * Invoice ID asignado tras el primer upload exitoso.
   * Se reutiliza si el usuario regresa al step 0 sin cambiar el PDF
   * (evita huérfanos en S3 y cuotas duplicadas).
   */
  private invoiceId: string | null = null;
  private uploadedFileFingerprint: string | null = null;
  private aiSubscription: Subscription | null = null;

  /** Opciones tipadas (valor técnico + clave i18n) — fuente única `@sms/common`. */
  protected readonly targetEntityOptions: InvoiceWizardDropdownOption<InvoiceTargetEntityType>[] =
    ALLOWED_TARGET_ENTITIES.map((value) => ({
      value,
      labelKey: ENTITY_TYPE_I18N[value as EntityType] as EntityTypeI18nKey
    }));

  protected readonly serviceTypeOptions: InvoiceWizardDropdownOption<EnergyServiceType>[] =
    ALLOWED_SERVICE_TYPES.map((value) => ({
      value,
      labelKey: ENERGY_SERVICE_TYPE_I18N[value] as EnergyServiceTypeI18nKey
    }));

  protected readonly stepperItems = computed<MenuItem[]>(() => {
    const t = this.translate;
    return [
      { label: t.instant('INVOICE_WIZARD.STEPS.INGEST') },
      { label: t.instant('INVOICE_WIZARD.STEPS.EXTRACT') },
      { label: t.instant('INVOICE_WIZARD.STEPS.CLASSIFY') },
      { label: t.instant('INVOICE_WIZARD.STEPS.REVIEW') }
    ];
  });

  /** Payload `confirmInvoice` derivado del form (tipado por `@sms/common`). */
  protected readonly confirmPayload = computed<InvoiceConfirmPayload | null>(() => {
    const v = this.form.getRawValue();
    const ext = v.extract;
    const cls = v.classify;
    if (
      !v.ingest ||
      !ext.vendor ||
      !ext.invoiceNumber ||
      !ext.invoiceDate ||
      ext.totalAmount === null ||
      ext.consumptionValue === null ||
      !cls.targetEntity ||
      !cls.assetId ||
      !cls.serviceType ||
      cls.periodYear === null ||
      cls.periodMonth === null
    ) {
      return null;
    }
    return {
      extracted_data: {
        vendor: ext.vendor,
        VENDOR_TAX_ID: ext.vendorTaxId,
        invoice_number: ext.invoiceNumber,
        invoice_date: this.toIsoDate(ext.invoiceDate),
        billing_period: {
          start: this.toIsoDate(ext.billingPeriodStart),
          end: this.toIsoDate(ext.billingPeriodEnd)
        },
        total_amount: ext.totalAmount
      },
      ai_analysis: {
        service_type: cls.serviceType,
        value: ext.consumptionValue,
        unit: ext.consumptionUnit,
        year: cls.periodYear,
        calculation_method: 'consumption_based',
        requires_review: false
      },
      analytics_dimensions: {
        asset_id: cls.assetId,
        period_year: cls.periodYear,
        period_month: cls.periodMonth
      }
    };
  });

  constructor() {
    void this.auth.ensureSession();

    /** Cambios en `ingest` regeneran el PDF preview + resetean extracción IA. */
    this.form.controls.ingest.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((file) => {
        this.rebuildPdfSafeUrl(file);
        this.handleIngestChange(file);
      });

    /** Limpieza obligatoria: revoca ObjectURL + unsubscribe IA. */
    this.destroyRef.onDestroy(() => {
      this.revokeCurrentObjectUrl();
      this.tearDownAiSubscription();
    });
  }

  // ── File handling ─────────────────────────────────────────────────────────
  protected onFileSelect(event: { files: File[] }): void {
    const file = event.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.pushError('INVOICE_WIZARD.INGEST.ONLY_PDF');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.pushError('INVOICE_WIZARD.INGEST.MAX_SIZE');
      return;
    }

    this.clearErrors();
    this.form.controls.ingest.setValue(file);
  }

  protected onFileRemove(): void {
    this.form.controls.ingest.setValue(null);
  }

  private rebuildPdfSafeUrl(file: File | null): void {
    this.revokeCurrentObjectUrl();
    if (!file) {
      this.pdfSafeUrl.set(null);
      return;
    }
    this.currentObjectUrl = URL.createObjectURL(file);
    this.pdfSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.currentObjectUrl));
  }

  private revokeCurrentObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }

  /**
   * Cambiar el archivo invalida cualquier extracción IA previa.
   * Reseteamos el `invoiceId` (la próxima vez se generará uno nuevo) y los
   * campos del form de extracción para que el usuario espere la nueva IA.
   */
  private handleIngestChange(file: File | null): void {
    if (!file) {
      this.tearDownAiSubscription();
      this.invoiceId = null;
      this.uploadedFileFingerprint = null;
      this.extractState.set('idle');
      return;
    }
    const fp = this.fingerprint(file);
    if (fp !== this.uploadedFileFingerprint) {
      this.tearDownAiSubscription();
      this.invoiceId = null;
      this.uploadedFileFingerprint = null;
      this.extractState.set('idle');
      this.form.controls.extract.reset(
        {
          vendor: '',
          vendorTaxId: '',
          invoiceNumber: '',
          invoiceDate: null,
          billingPeriodStart: null,
          billingPeriodEnd: null,
          totalAmount: null,
          consumptionValue: null,
          consumptionUnit: 'kWh'
        },
        { emitEvent: false }
      );
    }
  }

  private fingerprint(file: File): string {
    return `${file.name}::${file.size}::${file.lastModified}`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  protected next(): void {
    if (!this.isCurrentStepValid()) {
      this.markCurrentStepTouched();
      this.pushError('INVOICE_WIZARD.ERRORS.FORM_INVALID');
      return;
    }
    this.clearErrors();

    /**
     * Al pasar Ingesta → Extracción disparamos upload + AI subscription en
     * background. Navegamos inmediatamente para que el overlay del step de
     * extracción tome el control visual (mejor UX que bloquear el botón).
     */
    if (this.activeStepIndex() === 0) {
      void this.startExtractionPipeline();
    }
    this.activeStepIndex.update((i) => Math.min(i + 1, 3));
  }

  protected prev(): void {
    this.clearErrors();
    this.activeStepIndex.update((i) => Math.max(i - 1, 0));
  }

  protected cancel(): void {
    this.tearDownAiSubscription();
    this.revokeCurrentObjectUrl();
    this.invoiceId = null;
    this.uploadedFileFingerprint = null;
    this.extractState.set('idle');
    this.form.reset();
    this.pdfSafeUrl.set(null);
    this.activeStepIndex.set(0);
    void this.router.navigate(['/compliance/invoices']);
  }

  private isCurrentStepValid(): boolean {
    const step = this.activeStepIndex();
    switch (step) {
      case 0:
        return this.form.controls.ingest.valid;
      case 1: {
        const ext = this.form.get('extract');
        return ext?.valid ?? false;
      }
      case 2: {
        const cls = this.form.get('classify');
        return cls?.valid ?? false;
      }
      default:
        return true;
    }
  }

  private markCurrentStepTouched(): void {
    const step = this.activeStepIndex();
    switch (step) {
      case 0:
        this.form.controls.ingest.markAsTouched();
        return;
      case 1:
        this.form.get('extract')?.markAllAsTouched();
        return;
      case 2:
        this.form.get('classify')?.markAllAsTouched();
        return;
    }
  }

  // ── Pipeline IA: upload S3 + subscribe AppSync ────────────────────────────
  /**
   * Solo se ejecuta una vez por PDF: sube el archivo, asigna un `invoiceId`,
   * y abre la suscripción `onInvoiceUpdated`. Mientras el usuario navega al
   * step de extracción, la subscription queda viva y patcheará el form
   * cuando el worker emita `READY_FOR_REVIEW`.
   */
  private async startExtractionPipeline(): Promise<void> {
    const file = this.form.controls.ingest.value;
    if (!file) {
      this.pushError('INVOICE_WIZARD.ERRORS.MISSING_FILE');
      return;
    }
    if (this.invoiceId && this.aiSubscription) {
      return;
    }
    if (this.invoiceId && !this.aiSubscription) {
      this.subscribeAi(this.invoiceId);
      return;
    }

    this.extractState.set('uploading');
    try {
      const invoiceId = toInvoiceDynamoId(crypto.randomUUID());
      const presigned = await this.appsync.getPresignedUrl(file.name, file.type, invoiceId);
      const upload = await this.s3.putObject(presigned.uploadURL, file);
      if (!upload.success) {
        throw new Error('S3_PUT_FAILED');
      }
      this.invoiceId = invoiceId;
      this.uploadedFileFingerprint = this.fingerprint(file);
      this.extractState.set('awaiting_ai');
      this.subscribeAi(invoiceId);
    } catch (err: unknown) {
      this.extractState.set('failed');
      const message = err instanceof Error ? err.message : String(err);
      const key =
        message === 'S3_PUT_FAILED'
          ? 'INVOICE_WIZARD.ERRORS.UPLOAD_FAILED'
          : 'INVOICE_WIZARD.ERRORS.CONFIRM_FAILED';
      this.pushError(key);
      this.notify.error(this.translate.instant(key), message);
    }
  }

  private subscribeAi(invoiceId: string): void {
    this.tearDownAiSubscription();
    this.extractState.set('awaiting_ai');

    this.aiSubscription = this.appsync.onInvoiceUpdated(invoiceId).subscribe({
      next: (event: InvoiceUpdatedGraphqlEvent) => {
        const payload = this.pickInvoiceUpdatedPayload(event);
        if (!payload) return;
        const status = String(payload.status ?? '').toUpperCase();
        if (status === 'FAILED') {
          this.extractState.set('failed');
          this.tearDownAiSubscription();
          return;
        }
        if (status !== 'READY_FOR_REVIEW') {
          return;
        }
        this.applyAiExtraction(payload);
      },
      error: (err: unknown) => {
        console.error('AI subscription error', err);
        this.extractState.set('failed');
      }
    });
  }

  private applyAiExtraction(payload: InvoiceUpdatedPayload): void {
    try {
      const parsed = this.parser.parse(payload.extractedData);
      const fields = mapParsedToExtractionFields(parsed);
      this.form.controls.extract.patchValue(
        {
          vendor: fields.vendor,
          vendorTaxId: fields.vendorTaxId,
          invoiceNumber: fields.invoiceNumber,
          invoiceDate: fields.invoiceDate,
          billingPeriodStart: fields.billingPeriodStart,
          billingPeriodEnd: fields.billingPeriodEnd,
          totalAmount: fields.totalAmount,
          consumptionValue: fields.consumptionValue,
          consumptionUnit: fields.consumptionUnit || 'kWh'
        },
        { emitEvent: true }
      );
      this.extractState.set('ready');
      this.tearDownAiSubscription();
    } catch (err: unknown) {
      console.error('Failed to apply AI extraction', err);
      this.extractState.set('failed');
    }
  }

  private pickInvoiceUpdatedPayload(
    response: InvoiceUpdatedGraphqlEvent
  ): InvoiceUpdatedPayload | undefined {
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

  private tearDownAiSubscription(): void {
    if (this.aiSubscription) {
      this.aiSubscription.unsubscribe();
      this.aiSubscription = null;
    }
  }

  // ── Submit final: confirmInvoice ─────────────────────────────────────────
  /**
   * El PDF ya está en S3 (subido en `startExtractionPipeline`); aquí sólo
   * confirmamos el shape post-validación humana al backend.
   */
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.pushError('INVOICE_WIZARD.ERRORS.FORM_INVALID');
      return;
    }
    const payload = this.confirmPayload();
    if (!payload) {
      this.pushError('INVOICE_WIZARD.ERRORS.FORM_INVALID');
      return;
    }
    if (!this.invoiceId) {
      this.pushError('INVOICE_WIZARD.ERRORS.MISSING_FILE');
      return;
    }

    this.submitting.set(true);
    this.clearErrors();

    try {
      const cls = this.form.controls.classify.getRawValue();
      await this.appsync.confirmInvoice(this.invoiceId, {
        status: 'CONFIRMED',
        extracted_data: JSON.stringify(payload),
        buildingId: cls.targetEntity === 'BUILDING' ? cls.assetId : '',
        meterId: cls.targetEntity === 'METER' ? cls.assetId : null,
        costCenterId: '',
        notes: '',
        serviceType: cls.serviceType ?? undefined
      });
      this.notify.success(
        this.translate.instant('INVOICE_WIZARD.SUCCESS.TITLE'),
        this.translate.instant('INVOICE_WIZARD.SUCCESS.BODY')
      );
      this.cancel();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.pushError('INVOICE_WIZARD.ERRORS.CONFIRM_FAILED');
      this.notify.error(this.translate.instant('INVOICE_WIZARD.ERRORS.CONFIRM_FAILED'), message);
    } finally {
      this.submitting.set(false);
    }
  }

  // ── Utils ─────────────────────────────────────────────────────────────────
  private toIsoDate(d: Date | null): string {
    return d ? d.toISOString().slice(0, 10) : '';
  }

  private pushError(translationKey: string): void {
    this.errors.set([
      { severity: 'error', detail: this.translate.instant(translationKey), closable: false }
    ]);
  }

  private clearErrors(): void {
    if (this.errors().length > 0) this.errors.set([]);
  }

  protected dynamoPreviewJson(): string {
    const payload = this.confirmPayload();
    return payload ? JSON.stringify(payload, null, 2) : '';
  }
}
