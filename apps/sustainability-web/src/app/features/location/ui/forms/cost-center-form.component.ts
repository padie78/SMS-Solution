import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, type ValidationErrors } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import type { CostCenterDTO } from '@sms/common';
import type {
  SmsLocationNode,
  SmsLocationNodeMetadata,
  SmsNodeStatus
} from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
import { LocationFormActionsComponent } from './location-form-actions.component';
import { UiHelpTipComponent } from '../../../../ui/atoms/ui-help-tip/ui-help-tip.component';
import { UiInputSwitchComponent } from '../../../../ui/atoms/ui-input-switch/ui-input-switch.component';
import {
  COST_CENTER_FIELD_GRID_CLASS,
  COST_CENTER_FORM_DEFAULT_VALUE,
  COST_CENTER_FORM_ENUM_OPTIONS,
  COST_CENTER_FORM_TABS,
  buildCostCenterFormGroup,
  costCenterFormRawValueToDTO,
  hydrateCostCenterFormFromPartial,
  type CostCenterFormFieldDef,
  type CostCenterFormGroup,
  type CostCenterFormShape,
  type CostCenterFormTabDef,
  type CostCenterFormValue,
  type CostCenterHydrationPatch,
  type SelectOption
} from './cost-center-form.config';

function toSmsNodeStatus(status: unknown): SmsNodeStatus {
  if (status === 'ACTIVE' || status === 'OPERATIONAL') return 'ACTIVE';
  if (status === 'ALERT') return 'ALERT';
  return 'MAINTENANCE';
}

@Component({
  selector: 'sms-cost-center-form',
  standalone: true,
  host: {
    class: 'block w-full min-w-0 box-border'
  },
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    LocationFormActionsComponent,
    UiHelpTipComponent,
    UiInputSwitchComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cost-center-form.component.html'
})
export class CostCenterFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;
  @Output() dto = new EventEmitter<CostCenterDTO>();

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  readonly preview = signal(false);

  readonly tabs: ReadonlyArray<CostCenterFormTabDef> = COST_CENTER_FORM_TABS;
  readonly activeTabId = signal<string>(COST_CENTER_FORM_TABS[0]?.id ?? 'general');

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);

  readonly form: CostCenterFormGroup = buildCostCenterFormGroup(this.fb);
  private lastResetValue: CostCenterFormValue | null = null;
  readonly controls = this.form.controls as CostCenterFormShape;

  ngOnChanges(): void {
    this.form.reset(COST_CENTER_FORM_DEFAULT_VALUE, { emitEvent: false });

    const ctx = this.ctx();
    const orgId =
      typeof ctx.organizationId === 'string' && ctx.organizationId
        ? ctx.organizationId
        : ((this.parentNode.metadata?.organizationId as string | undefined) ?? '');

    const meta: CostCenterHydrationPatch =
      this.parentNode.metadata &&
      typeof this.parentNode.metadata === 'object' &&
      ('name' in this.parentNode.metadata ||
        'annualBudget' in this.parentNode.metadata ||
        'id' in this.parentNode.metadata)
        ? (this.parentNode.metadata as unknown as CostCenterHydrationPatch)
        : {};

    hydrateCostCenterFormFromPartial(this.form, { ...meta, organizationId: orgId || meta.organizationId });

    if (ctx.branchId) {
      this.form.controls.branchId.setValue(ctx.branchId, { emitEvent: false });
    }
    if (ctx.buildingId) {
      this.form.controls.buildingId.setValue(ctx.buildingId, { emitEvent: false });
    }

    if (this.parentNode.type === 'COST_CENTER' && this.parentNode.location_id) {
      this.form.controls.id.setValue(this.parentNode.location_id, { emitEvent: false });
    }

    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.buildingId.disable({ emitEvent: false });

    this.lastResetValue = this.form.getRawValue() as CostCenterFormValue;
    this.form.markAsPristine();
  }

  gridClass(field: CostCenterFormFieldDef): string {
    return COST_CENTER_FIELD_GRID_CLASS[field.mdCols];
  }

  enumOptions(key: keyof typeof COST_CENTER_FORM_ENUM_OPTIONS | undefined): Array<SelectOption<string>> {
    if (!key) return [];
    return [...COST_CENTER_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  dtoPreview(): string {
    try {
      return JSON.stringify(costCenterFormRawValueToDTO(this.form.getRawValue() as CostCenterFormValue), null, 2);
    } catch {
      return '{}';
    }
  }

  errorMessage<K extends keyof CostCenterFormValue>(key: K): string | null {
    const c = this.form.controls[key];
    const errs = c.errors as ValidationErrors | null;
    if (!errs) return null;
    if (errs['required']) return 'Campo obligatorio.';
    if (errs['min']) return `Valor mínimo: ${errs['min'].min}.`;
    if (errs['max']) return `Valor máximo: ${errs['max'].max}.`;
    if (errs['maxlength']) return `Máximo ${errs['maxlength'].requiredLength} caracteres.`;
    if (errs['email']) return 'Email inválido.';
    return null;
  }

  reset(): void {
    if (!this.lastResetValue) return;
    this.form.reset(this.lastResetValue, { emitEvent: false });
    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.buildingId.disable({ emitEvent: false });
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = costCenterFormRawValueToDTO(this.form.getRawValue() as CostCenterFormValue);
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: toSmsNodeStatus(dto.status),
        metadata: dto as unknown as SmsLocationNodeMetadata
      });
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.lastResetValue = this.form.getRawValue() as CostCenterFormValue;
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando centro de costo';
      this.location.lastError.set(msg);
    }
  }
}
