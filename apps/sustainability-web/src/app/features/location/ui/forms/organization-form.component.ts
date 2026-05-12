import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import type { CostCenterDTO, OrganizationDTO } from '@sms/common';
import type { SmsLocationNode, SmsLocationNodeMetadata } from '../../../../core/models/sms-location-node.model';
import {
  ORG_COST_CENTERS_CUSTOM_KEY,
  parseOrganizationCostCentersFromMetadata
} from '../../../../services/state/organization-cost-center-registry.service';
import { NotificationService } from '../../../../services/ui/notification.service';
import { isSmsTreeDraftNode, stripSmsLocalDraftFromMetadata } from '../../lib/location-tree-helpers';
import { LocationService } from '../../services/location.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
import { LocationFormActionsComponent } from './location-form-actions.component';
import { LocationFormFieldComponent } from './location-form-field.component';
import { OrganizationCostCenterTableComponent } from './organization-cost-center-table.component';
import {
  ORGANIZATION_COST_CENTERS_TAB_ID,
  ORGANIZATION_FORM_ENUM_OPTIONS,
  ORGANIZATION_FORM_TABS,
  buildOrganizationFormGroup,
  hydrateOrganizationFormFromPartial,
  organizationFormRawValueToDTO,
  type OrganizationFormGroup,
  type OrganizationFormShape,
  type OrganizationFormTabDef,
  type OrganizationFormValue,
  type SelectOption
} from './organization-form.config';

@Component({
  selector: 'sms-organization-form',
  standalone: true,
  host: {
    class: 'block w-full min-w-0 box-border'
  },
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    OrganizationCostCenterTableComponent,
    LocationFormActionsComponent,
    LocationFormFieldComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-form.component.html'
})
export class OrganizationFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  readonly tabs: ReadonlyArray<OrganizationFormTabDef> = ORGANIZATION_FORM_TABS;
  readonly activeTabId = signal<string>(ORGANIZATION_FORM_TABS[0]?.id ?? 'general');
  readonly costCentersTabId = ORGANIZATION_COST_CENTERS_TAB_ID;
  readonly costCentersState = signal<CostCenterDTO[]>([]);

  readonly form: OrganizationFormGroup = buildOrganizationFormGroup(this.fb);

  readonly preview = signal(false);
  private lastResetValue: OrganizationFormValue | null = null;

  /** Expuesto para el template (@for campo → acceso fuertemente tipado a controles). */
  readonly controls = this.form.controls as OrganizationFormShape;

  ngOnChanges(): void {
    const orgId = this.ctx().organizationId ?? this.parentNode.location_id;
    this.form.controls.orgId.setValue(orgId, { emitEvent: false });

    const meta =
      this.parentNode.metadata &&
      typeof this.parentNode.metadata === 'object' &&
      /* metadata es extendida en tiempo de ejecución */
      ('name' in this.parentNode.metadata || 'orgId' in this.parentNode.metadata)
        ? (this.parentNode.metadata as unknown as Partial<OrganizationDTO>)
        : undefined;

    if (meta && Object.keys(meta).length > 0) {
      hydrateOrganizationFormFromPartial(this.form, meta, orgId);
    }

    this.costCentersState.set(parseOrganizationCostCentersFromMetadata(this.parentNode.metadata));

    this.form.controls.orgId.disable({ emitEvent: false });
    this.lastResetValue = this.form.getRawValue() as OrganizationFormValue;
    this.form.markAsPristine();
  }

  onCostCentersChange(list: CostCenterDTO[]): void {
    this.costCentersState.set(list);
    this.form.markAsDirty();
  }

  enumOptions(
    key: keyof typeof ORGANIZATION_FORM_ENUM_OPTIONS | undefined
  ): Array<SelectOption<string>> {
    if (!key) return [];
    return [...ORGANIZATION_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  dtoPreview(): string {
    try {
      return JSON.stringify(
        {
          ...organizationFormRawValueToDTO(this.form.getRawValue() as OrganizationFormValue),
          costCenters: this.costCentersState()
        },
        null,
        2
      );
    } catch {
      return '{}';
    }
  }

  reset(): void {
    if (!this.lastResetValue) return;
    this.form.reset(this.lastResetValue, { emitEvent: false });
    this.form.controls.orgId.disable({ emitEvent: false });
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = organizationFormRawValueToDTO(this.form.getRawValue() as OrganizationFormValue);
    const costCenters = this.costCentersState();

    const previousCustom =
      (this.parentNode.metadata?.custom ?? null) as Record<string, string> | null;
    const nextCustomRecord: Record<string, string> = { ...(previousCustom ?? {}) };
    delete nextCustomRecord[ORG_COST_CENTERS_CUSTOM_KEY];
    const nextCustom =
      Object.keys(nextCustomRecord).length > 0 ? nextCustomRecord : null;

    const nextMetadata = stripSmsLocalDraftFromMetadata({
      ...(this.parentNode.metadata ?? {}),
      ...(dto as unknown as SmsLocationNodeMetadata),
      custom: nextCustom,
      costCenters
    });

    const wasDraft = isSmsTreeDraftNode(this.parentNode);
    try {
      if (wasDraft) {
        await this.location.finalizeLocationNodeDraft(this.parentNode.location_id, {
          name: dto.name,
          status: dto.status === 'ACTIVE' ? 'ACTIVE' : 'MAINTENANCE',
          metadata: nextMetadata
        });
      } else {
        await this.location.updateNode(this.parentNode.location_id, {
          name: dto.name,
          status: dto.status === 'ACTIVE' ? 'ACTIVE' : 'MAINTENANCE',
          metadata: nextMetadata
        });
      }
      this.location.lastError.set(null);
      this.costCentersState.set(costCenters);
      this.lastResetValue = this.form.getRawValue() as OrganizationFormValue;
      this.form.markAsPristine();
      this.notify.success(
        wasDraft ? 'Organización creada' : 'Organización guardada',
        wasDraft ? `"${dto.name}" quedó registrada en la jerarquía.` : `Se actualizaron los datos de "${dto.name}".`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando organización';
      this.location.lastError.set(msg);
      this.notify.error('No se pudo guardar la organización', msg);
    }
  }
}
