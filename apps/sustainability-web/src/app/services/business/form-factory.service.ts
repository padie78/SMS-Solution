import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { InvoiceUploadFormSnapshot } from '../state/invoice-state.service';

export type InvoiceUploadFormGroup = FormGroup<{
  regionId: FormControl<string>;
  branchId: FormControl<string>;
  serviceType: FormControl<string>;
  building: FormControl<string>;
  meterId: FormControl<string>;
  costCenter: FormControl<string>;
  internalNote: FormControl<string>;
}>;

@Injectable({ providedIn: 'root' })
export class FormFactoryService {
  buildInvoiceUploadForm(): InvoiceUploadFormGroup {
    return new FormGroup({
      regionId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      branchId: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
      serviceType: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      building: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
      meterId: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
      costCenter: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
      internalNote: new FormControl('', { nonNullable: true })
    });
  }

  snapshotFromUploadForm(form: InvoiceUploadFormGroup): InvoiceUploadFormSnapshot {
    const v = form.getRawValue();
    return {
      regionId: v.regionId,
      branchId: v.branchId,
      serviceType: v.serviceType,
      building: v.building,
      meterId: v.meterId,
      costCenter: v.costCenter,
      internalNote: v.internalNote
    };
  }
}
