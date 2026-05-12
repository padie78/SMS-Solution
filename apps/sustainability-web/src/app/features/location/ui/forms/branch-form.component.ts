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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import type { BranchDTO, BranchStatus, TariffDTO, EntityType } from '@sms/common';
import {
  EntityTypePickerComponent,
  type EntityPickerSubmitPayload
} from '../../../entity-picker/entity-type-picker.component';
import type { SmsLocationNode, SmsLocationNodeMetadata, SmsNodeStatus } from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { isSmsTreeDraftNode, stripSmsLocalDraftFromMetadata } from '../../lib/location-tree-helpers';
import { NotificationService } from '../../../../services/ui/notification.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
import { LocationFormActionsComponent } from './location-form-actions.component';
import { LocationFormFieldComponent } from './location-form-field.component';
import { NodeCostCenterMultiPickerComponent } from './node-cost-center-multi-picker.component';
import {
  patchNodeCostCenterIdsOnMetadata,
  readNodeCostCenterIds,
  sanitizeIds
} from './node-cost-center-metadata.util';
import { BranchTariffTableComponent } from './branch-tariff-table.component';
import {
  BRANCH_FORM_ENUM_OPTIONS,
  BRANCH_FORM_TABS,
  BRANCH_TARIFFS_TAB_ID,
  branchFormRawValueToDTO,
  buildBranchFormGroup,
  hydrateBranchFormFromPartial,
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
    NodeCostCenterMultiPickerComponent,
    BranchTariffTableComponent,
    LocationFormActionsComponent,
    LocationFormFieldComponent,
    EntityTypePickerComponent
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

  /** Lista de Cost Centers asignados (multi). Se persiste en `metadata.costCenterIds` (lista nativa). */
  readonly selectedCostCenterIds = signal<string[]>([]);

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  readonly form: BranchFormGroup = buildBranchFormGroup(this.fb);
  private lastResetValue: BranchFormValue | null = null;
  readonly controls = this.form.controls as BranchFormShape;

  /** Demo i18n: último `EntityType` capturado por `sms-entity-type-picker`. */
  readonly pickedEntityType = signal<EntityType | null>(null);

  onEntityTypePicked(payload: EntityPickerSubmitPayload): void {
    this.pickedEntityType.set(payload.entityType);
    this.notify.success(
      'EntityType capturado',
      `Valor técnico enviado a la API: ${payload.entityType}`
    );
  }

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

    const ccPatch = patchNodeCostCenterIdsOnMetadata(this.parentNode.metadata, ccIds);
    const nextMetadata = stripSmsLocalDraftFromMetadata({
      ...(this.parentNode.metadata ?? {}),
      ...(dto as unknown as SmsLocationNodeMetadata),
      ...ccPatch,
      tariffs: this.tariffsState()
    });

    const wasDraft = isSmsTreeDraftNode(this.parentNode);
    try {
      if (wasDraft) {
        await this.location.finalizeLocationNodeDraft(this.parentNode.location_id, {
          name: dto.name,
          status: branchStatusToSmsNodeStatus(dto.status),
          metadata: nextMetadata
        });
      } else {
        await this.location.updateNode(this.parentNode.location_id, {
          name: dto.name,
          status: branchStatusToSmsNodeStatus(dto.status),
          metadata: nextMetadata
        });
      }
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.costCentersSelected.emit(ccIds);
      this.lastResetValue = this.form.getRawValue() as BranchFormValue;
      this.form.markAsPristine();
      this.notify.success(
        wasDraft ? 'Sucursal creada' : 'Sucursal guardada',
        wasDraft ? `"${dto.name}" quedó registrada en la jerarquía.` : `Se actualizaron los datos de "${dto.name}".`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando sucursal';
      this.location.lastError.set(msg);
      this.notify.error('No se pudo guardar la sucursal', msg);
    }
  }
}
