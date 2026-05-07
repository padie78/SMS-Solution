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
import type { AssetDTO, AssetLifecycleStatus } from '@sms/common';
import type {
  SmsLocationNode,
  SmsLocationNodeMetadata,
  SmsNodeStatus
} from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { CostCenterAutocompleteComponent } from './cost-center-autocomplete.component';
import { resolveHierarchyContext } from './location-hierarchy-context';
import {
  ASSET_FIELD_GRID_CLASS,
  ASSET_FORM_ENUM_OPTIONS,
  ASSET_FORM_TABS,
  assetFormRawValueToDTO,
  buildAssetFormGroup,
  hydrateAssetFormFromPartial,
  type AssetFormFieldDef,
  type AssetFormGroup,
  type AssetFormShape,
  type AssetFormTabDef,
  type AssetFormValue,
  type SelectOption
} from './asset-form.config';

function assetLifecycleStatusToSmsNodeStatus(s: AssetLifecycleStatus): SmsNodeStatus {
  if (s === 'ACTIVE') return 'ACTIVE';
  return 'MAINTENANCE';
}

@Component({
  selector: 'sms-asset-form',
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
  templateUrl: './asset-form.component.html'
})
export class AssetFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;
  @Output() dto = new EventEmitter<AssetDTO>();

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  readonly preview = signal(false);

  readonly tabs: ReadonlyArray<AssetFormTabDef> = ASSET_FORM_TABS;
  readonly activeTabId = signal<string>(ASSET_FORM_TABS[0]?.id ?? 'general');

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);

  readonly form: AssetFormGroup = buildAssetFormGroup(this.fb);
  private lastResetValue: AssetFormValue | null = null;
  readonly controls = this.form.controls as AssetFormShape;

  ngOnChanges(): void {
    const ctx = this.ctx();
    const orgId =
      typeof ctx.organizationId === 'string' && ctx.organizationId
        ? ctx.organizationId
        : ((this.parentNode.metadata?.organizationId as string | undefined) ?? '');
    const regionId =
      typeof ctx.regionId === 'string' && ctx.regionId ? ctx.regionId : '';
    const branchId =
      typeof ctx.branchId === 'string' && ctx.branchId ? ctx.branchId : '';
    const buildingId =
      typeof ctx.buildingId === 'string' && ctx.buildingId ? ctx.buildingId : '';
    const assetId =
      this.parentNode.type === 'ASSET' && this.parentNode.location_id
        ? this.parentNode.location_id
        : '';

    const meta =
      this.parentNode.metadata &&
      typeof this.parentNode.metadata === 'object' &&
      ('name' in this.parentNode.metadata ||
        'type' in this.parentNode.metadata ||
        'id' in this.parentNode.metadata)
        ? (this.parentNode.metadata as unknown as Partial<AssetDTO>)
        : {};

    hydrateAssetFormFromPartial(
      this.form,
      meta,
      String(orgId),
      regionId,
      branchId,
      buildingId,
      assetId
    );

    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.buildingId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });

    this.lastResetValue = this.form.getRawValue() as AssetFormValue;
    this.form.markAsPristine();
  }

  gridClass(field: AssetFormFieldDef): string {
    return ASSET_FIELD_GRID_CLASS[field.mdCols];
  }

  enumOptions(key: keyof typeof ASSET_FORM_ENUM_OPTIONS | undefined): Array<SelectOption<string>> {
    if (!key) return [];
    return [...ASSET_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  onCostCenterChange(id: string | null): void {
    this.form.controls.costCenterId.setValue(id ?? '');
    this.form.controls.costCenterId.markAsDirty();
    this.form.markAsDirty();
  }

  dtoPreview(): string {
    try {
      return JSON.stringify(assetFormRawValueToDTO(this.form.getRawValue() as AssetFormValue), null, 2);
    } catch {
      return '{}';
    }
  }

  errorMessage<K extends keyof AssetFormValue>(key: K): string | null {
    const c = this.form.controls[key];
    const errs = c.errors as ValidationErrors | null;
    if (!errs) return null;
    if (errs['required']) return 'Campo obligatorio.';
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
    this.form.controls.buildingId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = assetFormRawValueToDTO(this.form.getRawValue() as AssetFormValue);
    this.location.lastError.set('Guardando activo…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: assetLifecycleStatusToSmsNodeStatus(dto.status),
        metadata: dto as unknown as SmsLocationNodeMetadata
      });
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.lastResetValue = this.form.getRawValue() as AssetFormValue;
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando activo';
      this.location.lastError.set(msg);
    }
  }
}
