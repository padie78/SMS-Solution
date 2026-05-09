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
import type { MeterDTO, MeterOperationalStatus } from '@sms/common';
import type {
  SmsLocationNode,
  SmsLocationNodeMetadata,
  SmsNodeStatus
} from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { isSmsTreeDraftNode, stripSmsLocalDraftFromMetadata } from '../../lib/location-tree-helpers';
import { NotificationService } from '../../../../services/ui/notification.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
import { LocationFormActionsComponent } from './location-form-actions.component';
import { NodeCostCenterMultiPickerComponent } from './node-cost-center-multi-picker.component';
import { UiHelpTipComponent } from '../../../../ui/atoms/ui-help-tip/ui-help-tip.component';
import { UiInputSwitchComponent } from '../../../../ui/atoms/ui-input-switch/ui-input-switch.component';
import {
  readNodeCostCenterIds,
  sanitizeIds,
  writeNodeCostCenterIdsCustom
} from './node-cost-center-metadata.util';
import {
  METER_FIELD_GRID_CLASS,
  METER_FORM_ENUM_OPTIONS,
  METER_FORM_TABS,
  buildMeterFormGroup,
  hydrateMeterFormFromPartial,
  meterFormRawValueToDTO,
  type MeterFormFieldDef,
  type MeterFormGroup,
  type MeterFormShape,
  type MeterFormTabDef,
  type MeterFormValue,
  type MeterHydrationPatch,
  type SelectOption
} from './meter-form.config';

function meterOperationalStatusToSmsNodeStatus(status: MeterOperationalStatus): SmsNodeStatus {
  if (status === 'ACTIVE') return 'ACTIVE';
  if (status === 'FAULT') return 'ALERT';
  return 'MAINTENANCE';
}

@Component({
  selector: 'sms-meter-form',
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
    NodeCostCenterMultiPickerComponent,
    LocationFormActionsComponent,
    UiHelpTipComponent,
    UiInputSwitchComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meter-form.component.html'
})
export class MeterFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;
  @Output() dto = new EventEmitter<MeterDTO>();
  @Output() costCentersSelected = new EventEmitter<string[]>();

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  readonly preview = signal(false);
  /** Lista de Cost Centers asignados (multi). Se persiste en `metadata.custom.costCenterIds`. */
  readonly selectedCostCenterIds = signal<string[]>([]);
  /** Mantiene en signal el orgId resuelto vía ctx jerárquico para alimentar el picker. */
  readonly organizationIdForCC = signal<string>('');

  readonly tabs: ReadonlyArray<MeterFormTabDef> = METER_FORM_TABS;
  readonly activeTabId = signal<string>(METER_FORM_TABS[0]?.id ?? 'general');

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  readonly form: MeterFormGroup = buildMeterFormGroup(this.fb);
  private lastResetValue: MeterFormValue | null = null;
  readonly controls = this.form.controls as MeterFormShape;

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
    const meterId =
      this.parentNode.type === 'METER' && this.parentNode.location_id
        ? this.parentNode.location_id
        : '';

    const meta: MeterHydrationPatch =
      this.parentNode.metadata &&
      typeof this.parentNode.metadata === 'object' &&
      ('name' in this.parentNode.metadata ||
        'serialNumber' in this.parentNode.metadata ||
        'id' in this.parentNode.metadata)
        ? (this.parentNode.metadata as unknown as MeterHydrationPatch)
        : {};

    hydrateMeterFormFromPartial(
      this.form,
      meta,
      String(orgId),
      regionId,
      branchId,
      buildingId,
      meterId
    );

    this.form.controls.orgId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.buildingId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });

    this.organizationIdForCC.set(String(orgId));
    this.selectedCostCenterIds.set(readNodeCostCenterIds(this.parentNode.metadata));

    this.lastResetValue = this.form.getRawValue() as MeterFormValue;
    this.form.markAsPristine();
  }

  onCostCenterIdsChange(ids: string[]): void {
    this.selectedCostCenterIds.set(sanitizeIds(ids));
    this.form.markAsDirty();
  }

  gridClass(field: MeterFormFieldDef): string {
    return METER_FIELD_GRID_CLASS[field.mdCols];
  }

  enumOptions(key: keyof typeof METER_FORM_ENUM_OPTIONS | undefined): Array<SelectOption<string>> {
    if (!key) return [];
    return [...METER_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  dtoPreview(): string {
    try {
      return JSON.stringify(meterFormRawValueToDTO(this.form.getRawValue() as MeterFormValue), null, 2);
    } catch {
      return '{}';
    }
  }

  errorMessage<K extends keyof MeterFormValue>(key: K): string | null {
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
    this.form.controls.orgId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.buildingId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = meterFormRawValueToDTO(this.form.getRawValue() as MeterFormValue);
    const ccIds = this.selectedCostCenterIds();

    const nextCustom = writeNodeCostCenterIdsCustom(this.parentNode.metadata?.custom, ccIds);
    const nextMetadata = stripSmsLocalDraftFromMetadata({
      ...(this.parentNode.metadata ?? {}),
      ...(dto as unknown as SmsLocationNodeMetadata),
      custom: nextCustom
    });

    const wasDraft = isSmsTreeDraftNode(this.parentNode);
    try {
      if (wasDraft) {
        await this.location.finalizeLocationNodeDraft(this.parentNode.location_id, {
          name: dto.name,
          status: meterOperationalStatusToSmsNodeStatus(dto.status),
          metadata: nextMetadata
        });
      } else {
        await this.location.updateNode(this.parentNode.location_id, {
          name: dto.name,
          status: meterOperationalStatusToSmsNodeStatus(dto.status),
          metadata: nextMetadata
        });
      }
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.costCentersSelected.emit(ccIds);
      this.lastResetValue = this.form.getRawValue() as MeterFormValue;
      this.form.markAsPristine();
      this.notify.success(
        wasDraft ? 'Medidor creado' : 'Medidor guardado',
        wasDraft ? `"${dto.name}" quedó registrado en la jerarquía.` : `Se actualizaron los datos de "${dto.name}".`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando medidor';
      this.location.lastError.set(msg);
      this.notify.error('No se pudo guardar el medidor', msg);
    }
  }
}
