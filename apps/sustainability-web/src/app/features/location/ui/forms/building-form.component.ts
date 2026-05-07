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
import type { BuildingDTO, OperationalStatus } from '@sms/common';
import type {
  SmsLocationNode,
  SmsLocationNodeMetadata,
  SmsNodeStatus
} from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { CostCenterAutocompleteComponent } from './cost-center-autocomplete.component';
import { resolveHierarchyContext } from './location-hierarchy-context';
import {
  BUILDING_FIELD_GRID_CLASS,
  BUILDING_FORM_ENUM_OPTIONS,
  BUILDING_FORM_TABS,
  buildBuildingFormGroup,
  buildingFormRawValueToDTO,
  hydrateBuildingFormFromPartial,
  type BuildingFormFieldDef,
  type BuildingFormGroup,
  type BuildingFormShape,
  type BuildingFormTabDef,
  type BuildingFormValue,
  type SelectOption
} from './building-form.config';

function operationalStatusToSmsNodeStatus(s: OperationalStatus): SmsNodeStatus {
  if (s === 'OPERATIONAL') return 'ACTIVE';
  return 'MAINTENANCE';
}

@Component({
  selector: 'sms-building-form',
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
    CostCenterAutocompleteComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './building-form.component.html'
})
export class BuildingFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  @Output() dto = new EventEmitter<BuildingDTO>();
  @Output() costCenterSelected = new EventEmitter<string | null>();

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));

  readonly preview = signal(false);
  readonly selectedCostCenterId = signal<string | null>(null);

  readonly tabs: ReadonlyArray<BuildingFormTabDef> = BUILDING_FORM_TABS;
  readonly activeTabId = signal<string>(BUILDING_FORM_TABS[0]?.id ?? 'general');

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);

  readonly form: BuildingFormGroup = buildBuildingFormGroup(this.fb);
  private lastResetValue: BuildingFormValue | null = null;
  readonly controls = this.form.controls as BuildingFormShape;

  ngOnChanges(): void {
    const ctx = this.ctx();
    const orgId =
      typeof ctx.organizationId === 'string' && ctx.organizationId
        ? ctx.organizationId
        : ((this.parentNode.metadata?.organizationId as string | undefined) ?? '');
    const regionId =
      typeof ctx.regionId === 'string' && ctx.regionId ? ctx.regionId : '';
    const branchId = typeof ctx.branchId === 'string' && ctx.branchId ? ctx.branchId : '';
    const buildingId =
      this.parentNode.type === 'BUILDING' && this.parentNode.location_id
        ? this.parentNode.location_id
        : '';

    const meta =
      this.parentNode.metadata &&
      typeof this.parentNode.metadata === 'object' &&
      ('name' in this.parentNode.metadata ||
        'usageTypeEnum' in this.parentNode.metadata ||
        'id' in this.parentNode.metadata)
        ? (this.parentNode.metadata as unknown as Partial<BuildingDTO>)
        : {};

    hydrateBuildingFormFromPartial(
      this.form,
      meta,
      String(orgId),
      regionId,
      branchId,
      buildingId
    );

    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });

    this.selectedCostCenterId.set(null);

    this.lastResetValue = this.form.getRawValue() as BuildingFormValue;
    this.form.markAsPristine();
  }

  gridClass(field: BuildingFormFieldDef): string {
    return BUILDING_FIELD_GRID_CLASS[field.mdCols];
  }

  enumOptions(key: keyof typeof BUILDING_FORM_ENUM_OPTIONS | undefined): Array<SelectOption<string>> {
    if (!key) return [];
    return [...BUILDING_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  onCostCenterChange(id: string | null): void {
    this.selectedCostCenterId.set(id);
    this.form.markAsDirty();
  }

  dtoPreview(): string {
    try {
      return JSON.stringify(buildingFormRawValueToDTO(this.form.getRawValue() as BuildingFormValue), null, 2);
    } catch {
      return '{}';
    }
  }

  errorMessage<K extends keyof BuildingFormValue>(key: K): string | null {
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
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = buildingFormRawValueToDTO(this.form.getRawValue() as BuildingFormValue);
    this.location.lastError.set('Guardando edificio…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: operationalStatusToSmsNodeStatus(dto.status),
        metadata: dto as unknown as SmsLocationNodeMetadata
      });
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.costCenterSelected.emit(this.selectedCostCenterId());
      this.lastResetValue = this.form.getRawValue() as BuildingFormValue;
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando edificio';
      this.location.lastError.set(msg);
    }
  }
}
