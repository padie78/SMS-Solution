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
import { FormBuilder, ReactiveFormsModule, type ValidationErrors } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import type { SmsLocationNode } from '../../../../core/models/sms-location-node.model';
import { NotificationService } from '../../../../services/ui/notification.service';
import { LocationService } from '../../services/location.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
import { LocationFormActionsComponent } from './location-form-actions.component';
import { UiHelpTipComponent } from '../../../../ui/atoms/ui-help-tip/ui-help-tip.component';
import {
  REGION_FIELD_GRID_CLASS,
  REGION_FORM_ENUM_OPTIONS,
  REGION_FORM_TABS,
  buildRegionFormGroup,
  hydrateRegionFormFromPartial,
  regionFormRawValueToDTO,
  type RegionFormFieldDef,
  type RegionFormGroup,
  type RegionFormShape,
  type RegionFormTabDef,
  type RegionFormValue,
  type SelectOption
} from './region-form.config';
import type { RegionDTO } from '@sms/common';

@Component({
  selector: 'sms-region-form',
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
    LocationFormActionsComponent,
    UiHelpTipComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './region-form.component.html'
})
export class RegionFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);

  readonly tabs: ReadonlyArray<RegionFormTabDef> = REGION_FORM_TABS;
  readonly activeTabId = signal<string>(REGION_FORM_TABS[0]?.id ?? 'general');

  readonly form: RegionFormGroup = buildRegionFormGroup(this.fb);

  readonly preview = signal(false);
  private lastResetValue: RegionFormValue | null = null;

  readonly controls = this.form.controls as RegionFormShape;

  ngOnChanges(): void {
    const orgId = this.ctx().organizationId ?? this.parentNode.metadata?.organizationId ?? '';
    const regionId =
      this.parentNode.type === 'REGION' && this.parentNode.location_id
        ? this.parentNode.location_id
        : '';

    const meta =
      this.parentNode.metadata &&
      typeof this.parentNode.metadata === 'object' &&
      ('name' in this.parentNode.metadata ||
        'code' in this.parentNode.metadata ||
        'id' in this.parentNode.metadata)
        ? (this.parentNode.metadata as unknown as Partial<RegionDTO>)
        : {};

    hydrateRegionFormFromPartial(this.form, meta, String(orgId), regionId);

    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });
    this.lastResetValue = this.form.getRawValue() as RegionFormValue;
    this.form.markAsPristine();
  }

  gridClass(field: RegionFormFieldDef): string {
    return REGION_FIELD_GRID_CLASS[field.mdCols];
  }

  enumOptions(key: keyof typeof REGION_FORM_ENUM_OPTIONS | undefined): Array<SelectOption<string>> {
    if (!key) return [];
    return [...REGION_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  dtoPreview(): string {
    try {
      return JSON.stringify(regionFormRawValueToDTO(this.form.getRawValue() as RegionFormValue), null, 2);
    } catch {
      return '{}';
    }
  }

  errorMessage<K extends keyof RegionFormValue>(key: K): string | null {
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
    this.form.controls.id.disable({ emitEvent: false });
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = regionFormRawValueToDTO(this.form.getRawValue() as RegionFormValue);
    this.location.lastError.set('Guardando región…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: dto.status === 'ACTIVE' ? 'ACTIVE' : 'MAINTENANCE',
        metadata: dto as unknown as Record<string, unknown>
      });
      this.location.lastError.set(null);
      this.lastResetValue = this.form.getRawValue() as RegionFormValue;
      this.form.markAsPristine();
      this.notify.success('Región guardada', `Se actualizaron los datos de "${dto.name}".`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando región';
      this.location.lastError.set(msg);
      this.notify.error('No se pudo guardar la región', msg);
    }
  }
}
