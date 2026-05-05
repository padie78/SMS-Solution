import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SplitterModule } from 'primeng/splitter';
import { TagModule } from 'primeng/tag';
import type { InvoiceReviewView } from '../../../core/models/invoice-review.model';
import { InvoiceOnboardingUiService } from '../../../features/invoice-onboarding/services/invoice-onboarding-ui.service';
import { InvoiceStateService } from '../../../services/state/invoice-state.service';

@Component({
  selector: 'app-invoice-onboarding-step-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SplitterModule,
    InputTextModule,
    ButtonModule,
    TagModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-onboarding-step-form.component.html'
})
export class InvoiceOnboardingStepFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly invoiceState = inject(InvoiceStateService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly onboarding = inject(InvoiceOnboardingUiService);

  @Output() readonly continue = new EventEmitter<void>();

  readonly safePdfUrl = signal<SafeResourceUrl | null>(null);
  private rawBlobUrl: string | null = null;

  readonly form = this.fb.nonNullable.group({
    vendor: ['', [Validators.required, Validators.minLength(2)]],
    invoiceNumber: ['', [Validators.required]],
    billingPeriodStart: ['', [Validators.required]],
    billingPeriodEnd: ['', [Validators.required]],
    total: [0, [Validators.required, Validators.min(0.01)]],
    consumption: [0, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    const snap = this.invoiceState.getSnapshot();
    if (snap.file) {
      this.rawBlobUrl = URL.createObjectURL(snap.file);
      this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.rawBlobUrl));
    }
    const d = snap.extractedData;
    if (d) {
      this.form.patchValue({
        vendor: d.vendor ?? '',
        invoiceNumber: d.invoiceNumber ?? '',
        billingPeriodStart: d.billingPeriodStart ?? '',
        billingPeriodEnd: d.billingPeriodEnd ?? '',
        total: d.total ?? 0,
        consumption: d.consumption ?? 0
      });
    }
  }

  ngOnDestroy(): void {
    if (this.rawBlobUrl) {
      URL.revokeObjectURL(this.rawBlobUrl);
      this.rawBlobUrl = null;
    }
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const prev = this.invoiceState.getSnapshot().extractedData;
    const merged: InvoiceReviewView = {
      vendor: v.vendor.trim(),
      invoiceNumber: v.invoiceNumber.trim(),
      invoiceDate: v.billingPeriodEnd.trim(),
      total: Number(v.total),
      consumption: Number(v.consumption),
      currency: prev?.currency ?? 'EUR',
      date: v.billingPeriodEnd.trim(),
      billingPeriodStart: v.billingPeriodStart.trim(),
      billingPeriodEnd: v.billingPeriodEnd.trim(),
      lines: prev?.lines ?? [],
      confidence: prev?.confidence ?? 0,
      cups: prev?.cups,
      contractReference: prev?.contractReference,
      netAmount: prev?.netAmount,
      taxAmount: prev?.taxAmount
    };
    this.invoiceState.patchExtractedOptimistic(merged);
    this.continue.emit();
  }
}
