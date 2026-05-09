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
import type { BranchDTO, BranchStatus, TariffDTO } from '@sms/common';
import type { SmsLocationNode, SmsLocationNodeMetadata, SmsNodeStatus } from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { NotificationService } from '../../../../services/ui/notification.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
import { LocationFormActionsComponent } from './location-form-actions.component';
import { UiHelpTipComponent } from '../../../../ui/atoms/ui-help-tip/ui-help-tip.component';
import { UiInputSwitchComponent } from '../../../../ui/atoms/ui-input-switch/ui-input-switch.component';
import { NodeCostCenterMultiPickerComponent } from './node-cost-center-multi-picker.component';
import {
  readNodeCostCenterIds,
  sanitizeIds,
  writeNodeCostCenterIdsCustom
} from './node-cost-center-metadata.util';
import { BranchTariffTableComponent } from './branch-tariff-table.component';
import {
  BRANCH_FIELD_GRID_CLASS,
  BRANCH_FORM_ENUM_OPTIONS,
  BRANCH_FORM_TABS,
  BRANCH_TARIFFS_TAB_ID,
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
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    NodeCostCenterMultiPickerComponent,
    BranchTariffTableComponent,
    LocationFormActionsComponent,
    UiHelpTipComponent,
    UiInputSwitchComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branch-form.component.html'
})
export class BranchFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  @Output() dto = new EventEmitter<BranchDTO>();
  @Output() costCentersSelected = new EventEmitter<string[]>();
  @Output() tariffs = new EventEmitter<TariffDTO[]>();

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));

  readonly preview = signal(false);

  readonly tabs: ReadonlyArray<BranchFormTabDef> = BRANCH_FORM_TABS;
  readonly activeTabId = signal<string>(BRANCH_FORM_TABS[0]?.id ?? 'general');

  /** Tab id reservado para la grilla de tarifas (renderizado especial en el template). */
  readonly tariffsTabId = BRANCH_TARIFFS_TAB_ID;

  /** Estado local de tarifas para que add/edit/delete se reflejen al instante en la grilla. */
  readonly tariffsState = signal<TariffDTO[]>([]);

  /** Lista de Cost Centers asignados (multi). Se persiste en `metadata.custom.costCenterIds`. */
  readonly selectedCostCenterIds = signal<string[]>([]);

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

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

    const incomingTariffs = (this.parentNode.metadata as { tariffs?: unknown } | undefined)?.tariffs;
    if (Array.isArray(incomingTariffs)) {
      this.tariffsState.set(incomingTariffs as TariffDTO[]);
    } else {
      this.tariffsState.set([]);
    }

    this.selectedCostCenterIds.set(readNodeCostCenterIds(this.parentNode.metadata));

    this.lastResetValue = this.form.getRawValue() as BranchFormValue;
    this.form.markAsPristine();
  }

  onTariffsChange(list: TariffDTO[]): void {
    this.tariffsState.set(list);
    this.tariffs.emit(list);
    this.form.markAsDirty();
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

  onCostCenterIdsChange(ids: string[]): void {
    const cleaned = sanitizeIds(ids);
    this.selectedCostCenterIds.set(cleaned);
    // BranchDTO.costCenterId acepta sólo uno; sincronizamos con el primero como representación legacy.
    this.form.controls.costCenterId.setValue(cleaned[0] ?? null);
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
    const ccIds = this.selectedCostCenterIds();

    const nextCustom = writeNodeCostCenterIdsCustom(this.parentNode.metadata?.custom, ccIds);
    const nextMetadata: SmsLocationNodeMetadata = {
      ...(this.parentNode.metadata ?? {}),
      ...(dto as unknown as SmsLocationNodeMetadata),
      custom: nextCustom
    };

    this.location.lastError.set('Guardando sucursal…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: branchStatusToSmsNodeStatus(dto.status),
        metadata: nextMetadata
      });
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.costCentersSelected.emit(ccIds);
      this.lastResetValue = this.form.getRawValue() as BranchFormValue;
      this.form.markAsPristine();
      this.notify.success('Sucursal guardada', `Se actualizaron los datos de "${dto.name}".`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando sucursal';
      this.location.lastError.set(msg);
      this.notify.error('No se pudo guardar la sucursal', msg);
    }
  }
}
