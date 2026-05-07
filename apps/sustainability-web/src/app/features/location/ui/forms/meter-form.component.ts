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
import type { MeterDTO, MeterOperationalStatus } from '@sms/common';
import type {
  SmsLocationNode,
  SmsLocationNodeMetadata,
  SmsNodeStatus
} from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
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
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    DropdownModule,
    CheckboxModule,
    CalendarModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meter-form.component.html'
})
export class MeterFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;
  @Output() dto = new EventEmitter<MeterDTO>();

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  readonly preview = signal(false);

  readonly tabs: ReadonlyArray<MeterFormTabDef> = METER_FORM_TABS;
  readonly activeTabId = signal<string>(METER_FORM_TABS[0]?.id ?? 'general');

  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);

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

    this.lastResetValue = this.form.getRawValue() as MeterFormValue;
    this.form.markAsPristine();
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
    this.location.lastError.set('Guardando medidor…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: meterOperationalStatusToSmsNodeStatus(dto.status),
        metadata: dto as unknown as SmsLocationNodeMetadata
      });
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.lastResetValue = this.form.getRawValue() as MeterFormValue;
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando medidor';
      this.location.lastError.set(msg);
    }
  }
}
