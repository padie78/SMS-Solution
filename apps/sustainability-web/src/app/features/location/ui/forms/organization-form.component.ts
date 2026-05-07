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
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import type { OrganizationDTO } from '@sms/common';
import type { SmsLocationNode } from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import { resolveHierarchyContext } from './location-hierarchy-context';
import {
  ORGANIZATION_FIELD_GRID_CLASS,
  ORGANIZATION_FORM_ENUM_OPTIONS,
  ORGANIZATION_FORM_TABS,
  buildOrganizationFormGroup,
  hydrateOrganizationFormFromPartial,
  organizationFormRawValueToDTO,
  type OrganizationFormFieldDef,
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
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    DropdownModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-form.component.html'
})
export class OrganizationFormComponent implements OnChanges {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private readonly fb = inject(FormBuilder);

  readonly tabs: ReadonlyArray<OrganizationFormTabDef> = ORGANIZATION_FORM_TABS;
  readonly activeTabId = signal<string>(ORGANIZATION_FORM_TABS[0]?.id ?? 'general');

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

    this.form.controls.orgId.disable({ emitEvent: false });
    this.lastResetValue = this.form.getRawValue() as OrganizationFormValue;
    this.form.markAsPristine();
  }

  gridClass(field: OrganizationFormFieldDef): string {
    return ORGANIZATION_FIELD_GRID_CLASS[field.mdCols];
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
      return JSON.stringify(organizationFormRawValueToDTO(this.form.getRawValue() as OrganizationFormValue), null, 2);
    } catch {
      return '{}';
    }
  }

  errorMessage<K extends keyof OrganizationFormValue>(key: K): string | null {
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
    this.form.controls.orgId.disable({ emitEvent: false });
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = organizationFormRawValueToDTO(this.form.getRawValue() as OrganizationFormValue);
    this.location.lastError.set('Guardando organización…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: dto.status === 'ACTIVE' ? 'ACTIVE' : 'MAINTENANCE',
        metadata: dto as unknown as Record<string, unknown>
      });
      this.location.lastError.set(null);
      this.lastResetValue = this.form.getRawValue() as OrganizationFormValue;
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando organización';
      this.location.lastError.set(msg);
    }
  }
}
