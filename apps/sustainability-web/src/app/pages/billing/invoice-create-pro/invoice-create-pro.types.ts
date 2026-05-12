import type { FormControl, FormGroup } from '@angular/forms';
import type { EnergyServiceType } from '@sms/common';

/** Subconjunto de `EntityType` que puede recibir una factura. */
export type InvoiceTargetEntityType = 'BUILDING' | 'METER';

/** Opción técnica + key i18n para dropdowns del wizard. */
export interface InvoiceWizardDropdownOption<T extends string> {
  readonly value: T;
  readonly labelKey: string;
}

/** Shape plano del sub-grupo "Extracción" (campos editables del OCR). */
export interface InvoiceExtractShape {
  vendor: FormControl<string>;
  vendorTaxId: FormControl<string>;
  invoiceNumber: FormControl<string>;
  invoiceDate: FormControl<Date | null>;
  billingPeriodStart: FormControl<Date | null>;
  billingPeriodEnd: FormControl<Date | null>;
  totalAmount: FormControl<number | null>;
  consumptionValue: FormControl<number | null>;
  consumptionUnit: FormControl<string>;
}

/** Shape plano del sub-grupo "Clasificación". */
export interface InvoiceClassifyShape {
  targetEntity: FormControl<InvoiceTargetEntityType | null>;
  assetId: FormControl<string>;
  serviceType: FormControl<EnergyServiceType | null>;
  periodYear: FormControl<number | null>;
  periodMonth: FormControl<number | null>;
}

/** Forma del Reactive FormGroup raíz (4 sub-FormGroups, uno por step). */
export interface InvoiceWizardFormShape {
  ingest: FormControl<File | null>;
  extract: FormGroup<InvoiceExtractShape>;
  classify: FormGroup<InvoiceClassifyShape>;
}

/**
 * Estados del pipeline IA durante el step de extracción.
 *
 *  - `idle`       → no se ha subido el PDF todavía (usuario en step 0).
 *  - `uploading`  → S3 PUT presigned URL en curso.
 *  - `awaiting_ai`→ S3 OK; suscrito a `onInvoiceUpdated` esperando worker.
 *  - `ready`      → IA respondió y patcheamos el FormGroup de extracción.
 *  - `failed`     → algún paso falló (S3 / IA). El usuario puede editar manual.
 */
export type InvoiceExtractStateValue = 'idle' | 'uploading' | 'awaiting_ai' | 'ready' | 'failed';
