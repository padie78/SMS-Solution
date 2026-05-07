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
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import type { BranchDTO, BranchStatus } from '@sms/common';
import type { SmsLocationNode, SmsLocationNodeMetadata, SmsNodeStatus } from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
import { CostCenterAutocompleteComponent } from './cost-center-autocomplete.component';
import { TariffFormListComponent } from './tariff-form-list.component';
import {
  BRANCH_FIELD_GRID_CLASS,
  BRANCH_FORM_ENUM_OPTIONS,
  BRANCH_FORM_TABS,
  branchFormRawValueToDTO,
  buildBranchFormGroup,
  hydrateBranchFormFromPartial,
  type BranchFormFieldDef,
  type BranchFormGroup,
  type BranchFormShape,
  type BranchFormTabDef,
  type BranchFormValue,
  type SelectOption
} from './branch-form.config';

function branchStatusToSmsNodeStatus(status: BranchStatus): SmsNodeStatus {
  if (status === 'ACTIVE') return 'ACTIVE';
  return 'MAINTENANCE';
}

@Component({
  selector: 'sms-branch-form',
  standalone: true,
  host: {
    class: 'block w-full min-w-0 box-border'
  },
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    DropdownModule,
    CheckboxModule,
    CalendarModule,
    CostCenterAutocompleteComponent,
    TariffFormListComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branch-form.component.html'
})
export class BranchFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  @Output() dto = new EventEmitter<BranchDTO>();
  @Output() costCenterSelected = new EventEmitter<string | null>();
  @Output() tariffs = new EventEmitter<import('@sms/common').TariffDTO[]>();

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));

  readonly preview = signal(false);

  readonly tabs: ReadonlyArray<BranchFormTabDef> = BRANCH_FORM_TABS;
  readonly activeTabId = signal<string>(BRANCH_FORM_TABS[0]?.id ?? 'general');

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);

  readonly form: BranchFormGroup = buildBranchFormGroup(this.fb);
  private lastResetValue: BranchFormValue | null = null;
  readonly controls = this.form.controls as BranchFormShape;

  ngOnChanges(): void {
    const ctx = this.ctx();
    const orgId =
      typeof ctx.organizationId === 'string' && ctx.organizationId
        ? ctx.organizationId
        : (this.parentNode.metadata?.organizationId as string | undefined) ?? '';
    const regionId =
      typeof ctx.regionId === 'string' && ctx.regionId ? ctx.regionId : '';
    const branchId =
      this.parentNode.type === 'BRANCH' && this.parentNode.location_id
        ? this.parentNode.location_id
        : '';

    const meta =
      this.parentNode.metadata &&
      typeof this.parentNode.metadata === 'object' &&
      ('name' in this.parentNode.metadata ||
        'branchCode' in this.parentNode.metadata ||
        'id' in this.parentNode.metadata)
        ? (this.parentNode.metadata as unknown as Partial<BranchDTO>)
        : {};

    hydrateBranchFormFromPartial(this.form, meta, String(orgId), regionId, branchId);

    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });

    this.lastResetValue = this.form.getRawValue() as BranchFormValue;
    this.form.markAsPristine();
  }

  gridClass(field: BranchFormFieldDef): string {
    return BRANCH_FIELD_GRID_CLASS[field.mdCols];
  }

  enumOptions(key: keyof typeof BRANCH_FORM_ENUM_OPTIONS | undefined): Array<SelectOption<string>> {
    if (!key) return [];
    return [...BRANCH_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  onCostCenterChange(id: string | null): void {
    this.form.controls.costCenterId.setValue(id);
    this.form.markAsDirty();
  }

  dtoPreview(): string {
    try {
      return JSON.stringify(branchFormRawValueToDTO(this.form.getRawValue() as BranchFormValue), null, 2);
    } catch {
      return '{}';
    }
  }

  errorMessage<K extends keyof BranchFormValue>(key: K): string | null {
    const c = this.form.controls[key];
    const errs = c.errors as ValidationErrors | null;
    if (!errs) return null;
    if (errs['required']) return 'Campo obligatorio.';
    if (errs['email']) return 'Introduce un email válido.';
    if (errs['pattern']) return 'El formato del valor no es válido.';
    if (errs['min']) return `Valor mínimo: ${errs['min'].min}.`;
    if (errs['max']) return `Valor máximo: ${errs['max'].max}.`;
    return null;
  }

  reset(): void {
    if (!this.lastResetValue) return;
    this.form.reset(this.lastResetValue, { emitEvent: false });
    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = branchFormRawValueToDTO(this.form.getRawValue() as BranchFormValue);
    this.location.lastError.set('Guardando sucursal…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: branchStatusToSmsNodeStatus(dto.status),
        metadata: dto as unknown as SmsLocationNodeMetadata
      });
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.costCenterSelected.emit(this.form.controls.costCenterId.value);
      this.lastResetValue = this.form.getRawValue() as BranchFormValue;
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando sucursal';
      this.location.lastError.set(msg);
    }
  }
}
