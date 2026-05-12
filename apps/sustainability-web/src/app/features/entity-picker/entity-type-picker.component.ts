import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';

import {
  ENTITY_TYPE_I18N,
  ENTITY_TYPE_VALUES,
  EntityType,
  type EntityTypeI18nKey
} from '@sms/common';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../core/i18n/i18n.tokens';

/**
 * Opción tipada para PrimeNG dropdown.
 * - `value`: SIEMPRE el valor técnico (`EntityType`) — viaja a la API/DynamoDB.
 * - `labelKey`: clave i18n; la traducción la resuelve el pipe `| translate`.
 */
interface EntityTypeOption {
  readonly value: EntityType;
  readonly labelKey: EntityTypeI18nKey;
}

/** Forma estrictamente tipada del Reactive Form (zero `any`). */
interface EntityPickerFormShape {
  entityType: FormControl<EntityType | null>;
}

/** Payload emitido al submit — coincidiría con el contrato API/Lambda. */
export interface EntityPickerSubmitPayload {
  readonly entityType: EntityType;
}

@Component({
  selector: 'sms-entity-type-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, DropdownModule, ButtonModule],
  templateUrl: './entity-type-picker.component.html'
})
export class EntityTypePickerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  /** Emite el valor técnico del Enum (jamás el texto traducido). */
  @Output() readonly submitted = new EventEmitter<EntityPickerSubmitPayload>();

  /**
   * Opciones derivadas de la Shared Library — fuente única de verdad.
   * Array mutable (no readonly) porque PrimeNG `p-dropdown` tipa `options` como `any[]`.
   * La inmutabilidad real la garantizan `ENTITY_TYPE_VALUES` (frozen) en el origen.
   */
  protected readonly entityTypeOptions: EntityTypeOption[] = ENTITY_TYPE_VALUES.map((value) => ({
    value,
    labelKey: ENTITY_TYPE_I18N[value]
  }));

  /** Mutable copy — PrimeNG/Angular template tipa iteraciones como mutable. */
  protected readonly supportedLanguages: SupportedLanguage[] = [...SUPPORTED_LANGUAGES];

  protected readonly form: FormGroup<EntityPickerFormShape> = this.fb.group<EntityPickerFormShape>({
    entityType: this.fb.control<EntityType | null>(null, {
      validators: [Validators.required]
    })
  });

  constructor() {
    const initial = (this.translate.currentLang ?? this.translate.defaultLang) as SupportedLanguage;
    this.translate.use(initial);
  }

  protected switchLanguage(lang: SupportedLanguage): void {
    this.translate.use(lang);
  }

  /**
   * El submit envía el valor TÉCNICO (`EntityType`), nunca el texto traducido.
   * Esto preserva la inmutabilidad del contrato hacia DynamoDB/Lambda.
   */
  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const entityType = this.form.controls.entityType.value;
    if (entityType === null) {
      return;
    }

    this.submitted.emit({ entityType });
  }
}
