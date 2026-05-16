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
import type { AssetDTO, AssetLifecycleStatus } from '@sms/common';
import type {
  SmsLocationNode,
  SmsLocationNodeMetadata,
  SmsNodeStatus
} from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { isSmsTreeDraftNode, stripSmsLocalDraftFromMetadata } from '../../lib/location-tree-helpers';
import { NotificationService } from '../../../../services/ui/notification.service';
import { LocationFormActionsComponent } from './location-form-actions.component';
import { LocationFormFieldComponent } from './location-form-field.component';
import { NodeCostCenterMultiPickerComponent } from './node-cost-center-multi-picker.component';
import {
  patchNodeCostCenterIdsOnMetadata,
  readNodeCostCenterIds,
  sanitizeIds
} from './node-cost-center-metadata.util';
import { resolveHierarchyContext } from './location-hierarchy-context';
import {
  ASSET_FORM_ENUM_OPTIONS,
  ASSET_FORM_TABS,
  assetFormRawValueToDTO,
  buildAssetFormGroup,
  hydrateAssetFormFromPartial,
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
    NodeCostCenterMultiPickerComponent,
    LocationFormActionsComponent,
    LocationFormFieldComponent
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

  /** Lista de Cost Centers asignados (multi). Se persiste en `metadata.costCenterIds`. */
  readonly selectedCostCenterIds = signal<string[]>([]);

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

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

    // Multi-asignación: prioridad a metadata.costCenterIds (nativo) y fallback a custom JSON legacy.
    // Fallback al costCenterId del DTO (`controls.costCenterId.value`) si la lista viene vacía. t
    const fromMetadata = readNodeCostCenterIds(this.parentNode.metadata);
    if (fromMetadata.length > 0) {
      this.selectedCostCenterIds.set(fromMetadata);
    } else {
      const fromDto = (this.form.controls.costCenterId.value ?? '').trim();
      this.selectedCostCenterIds.set(
        fromDto.length > 0 && fromDto !== 'cc-unassigned' ? [fromDto] : []
      );
    }

    this.lastResetValue = this.form.getRawValue() as AssetFormValue;
    this.form.markAsPristine();
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

  onCostCenterIdsChange(ids: string[]): void {
    const cleaned = sanitizeIds(ids);
    this.selectedCostCenterIds.set(cleaned);
    // AssetDTO.costCenterId es required (zod usa 'cc-unassigned' como default si vacío).
    // Sincronizamos con el primero como representación para el DTO.
    this.form.controls.costCenterId.setValue(cleaned[0] ?? '');
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
    const ccIds = this.selectedCostCenterIds();

    const ccPatch = patchNodeCostCenterIdsOnMetadata(this.parentNode.metadata, ccIds);
    const nextMetadata = stripSmsLocalDraftFromMetadata({
      ...(this.parentNode.metadata ?? {}),
      ...(dto as unknown as SmsLocationNodeMetadata),
      ...ccPatch
    });

    const wasDraft = isSmsTreeDraftNode(this.parentNode);
    try {
      if (wasDraft) {
        await this.location.finalizeLocationNodeDraft(this.parentNode.location_id, {
          name: dto.name,
          status: assetLifecycleStatusToSmsNodeStatus(dto.status),
          metadata: nextMetadata
        });
      } else {
        await this.location.updateNode(this.parentNode.location_id, {
          name: dto.name,
          status: assetLifecycleStatusToSmsNodeStatus(dto.status),
          metadata: nextMetadata
        });
      }
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.lastResetValue = this.form.getRawValue() as AssetFormValue;
      this.form.markAsPristine();
      this.notify.success(
        wasDraft ? 'Activo creado' : 'Activo guardado',
        wasDraft ? `"${dto.name}" quedó registrado en la jerarquía.` : `Se actualizaron los datos de "${dto.name}".`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando activo';
      this.location.lastError.set(msg);
      this.notify.error('No se pudo guardar el activo', msg);
    }
  }
}
