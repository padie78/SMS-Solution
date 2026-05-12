import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import type { EnergyServiceType } from '@sms/common';
import type {
  InvoiceClassifyShape,
  InvoiceTargetEntityType,
  InvoiceWizardDropdownOption
} from '../invoice-create-pro.types';

@Component({
  selector: 'app-invoice-classify-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DropdownModule,
    InputTextModule,
    InputNumberModule,
    TagModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-classify-step.component.html'
})
export class InvoiceClassifyStepComponent {
  @Input({ required: true }) form!: FormGroup<InvoiceClassifyShape>;
  @Input({ required: true }) targetEntityOptions!: Array<
    InvoiceWizardDropdownOption<InvoiceTargetEntityType>
  >;
  @Input({ required: true }) serviceTypeOptions!: Array<
    InvoiceWizardDropdownOption<EnergyServiceType>
  >;
}
