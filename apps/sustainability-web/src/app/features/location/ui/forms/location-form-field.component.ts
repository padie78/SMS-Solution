/**
 * Renderer atómico de un campo declarativo dentro de los formularios del
 * Location Manager. Toma una `BaseLocationFormFieldDef` y se conecta al
 * `FormGroup` padre vía `ControlContainer` (sin pasar la instancia explícitamente).
 *
 * Beneficios:
 *  - Una única fuente de verdad para label + control + mensaje de error.
 *  - UX consistente: padding, bordes, foco esmeralda, transiciones suaves,
 *    asterisco para required, ayuda contextual y mensaje de error dinámico
 *    sólo cuando el control fue `touched` y es `invalid`.
 *  - Selectores con placeholder estándar `-- Seleccione una opción --`,
 *    deshabilitado para envío gracias al validador `required` + valor null inicial.
 */

import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlContainer,
  FormGroupDirective,
  ReactiveFormsModule,
  type AbstractControl
} from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';

import { UiHelpTipComponent } from '../../../../ui/atoms/ui-help-tip/ui-help-tip.component';
import { UiInputSwitchComponent } from '../../../../ui/atoms/ui-input-switch/ui-input-switch.component';
import {
  DEFAULT_SELECT_PLACEHOLDER,
  resolveLocationFormError,
  type BaseLocationFormFieldDef,
  type BaseSelectOption
} from './location-form-common';

@Component({
  selector: 'sms-location-form-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    UiHelpTipComponent,
    UiInputSwitchComponent
  ],
  /**
   * Hereda el `FormGroupDirective` del template padre para que `formControlName`
   * funcione dentro de este componente sin necesidad de redeclarar `formGroup`.
   */
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: (): ControlContainer => inject(FormGroupDirective, { skipSelf: true })
    }
  ],
  /**
   * Host bindings:
   *  - Clase estática `sms-form-field-host`: hook para CSS global.
   *  - Clases dinámicas `[class.sms-col-span-N]`: una sola se activa según
   *    el valor de `mdCols` (4|6|8|12). Aplicarlas AL host (no al div
   *    interno) es crucial: el padre `.sms-form-grid` necesita que el
   *    HIJO DIRECTO reciba `grid-column`, y el host del componente es ese
   *    hijo directo cuando el host no usa `display: contents`.
   */
  host: {
    class: 'sms-form-field-host',
    '[class.sms-col-span-4]': "field.mdCols === 4",
    '[class.sms-col-span-6]': "field.mdCols === 6",
    '[class.sms-col-span-8]': "field.mdCols === 8",
    '[class.sms-col-span-12]': "field.mdCols === 12",
    /**
     * Si el campo es `hidden` (o cualquier `!isVisible()`), el host se colapsa
     * con `display: none`. Sin esto, el host conserva `display: block` +
     * `grid-column: span N` y consume una celda + `row-gap` del grid padre,
     * generando una fila fantasma entre campos visibles.
     */
    '[class.sms-form-field-host--collapsed]': '!isVisible()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location-form-field.component.html',
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      /* Colapso total cuando el campo está oculto: sin esto el host
         seguiría ocupando una celda en el grid + consumiendo row-gap. */
      :host(.sms-form-field-host--collapsed) {
        display: none !important;
      }

      .sms-form-field {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      /* Label uniforme: caps pequeñas, slate-500, alto contraste para required */
      .sms-form-field__label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #64748b; /* slate-500 */
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        column-gap: 0.25rem;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        margin-bottom: 0.5rem;
      }

      .sms-form-field__label--invalid {
        color: #b91c1c; /* red-700 */
      }

      .sms-form-field__required {
        color: #e11d48; /* rose-600 */
        margin-left: 0.15rem;
        font-weight: 800;
      }

      /* Input/Textarea base: padding interno consistente y transición suave */
      .sms-form-field__input,
      .sms-form-field__textarea {
        width: 100%;
        border-radius: 12px;
        border: 1px solid #cbd5e1; /* slate-300 */
        background-color: #ffffff;
        color: #1e293b; /* slate-800 */
        font-size: 0.875rem;
        line-height: 1.4;
        /* Mismo padding horizontal que el input global p-inputtext (0.75rem)
           para que el texto del control alinee con el dropdown y no luche
           la cascada CSS por especificidad. */
        padding: 0 0.75rem;
        height: 40px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        transition:
          border-color 140ms ease,
          box-shadow 140ms ease,
          background-color 140ms ease;
      }

      .sms-form-field__textarea {
        height: auto;
        min-height: 6rem;
        padding: 0.65rem 0.75rem;
        resize: vertical;
      }

      .sms-form-field__input:hover:not(:focus):not([readonly]),
      .sms-form-field__textarea:hover:not(:focus):not([readonly]) {
        border-color: #94a3b8; /* slate-400 */
      }

      .sms-form-field__input:focus,
      .sms-form-field__textarea:focus {
        outline: none;
        border-color: #10b981; /* emerald-500 */
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
      }

      .sms-form-field__input[readonly],
      .sms-form-field__textarea[readonly] {
        background-color: #f8fafc; /* slate-50 */
        color: #64748b; /* slate-500 */
        cursor: not-allowed;
      }

      .sms-form-field--invalid .sms-form-field__input,
      .sms-form-field--invalid .sms-form-field__textarea {
        border-color: #f87171; /* red-400 */
      }

      .sms-form-field--invalid .sms-form-field__input:focus,
      .sms-form-field--invalid .sms-form-field__textarea:focus {
        border-color: #ef4444; /* red-500 */
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18);
      }

      .sms-form-field__error {
        margin-top: 0.3rem;
        font-size: 11px;
        font-weight: 600;
        color: #b91c1c; /* red-700 */
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }

      .sms-form-field__hint {
        margin-top: 0.25rem;
        font-size: 11px;
        color: #64748b; /* slate-500 */
      }
    `
  ]
})
export class LocationFormFieldComponent {
  /** Definición declarativa del campo. */
  @Input({ required: true }) field!: BaseLocationFormFieldDef;

  /** Prefijo para generar `id` HTML único por formulario (ej: `'region-field-'`). */
  @Input({ required: true }) formIdPrefix!: string;

  /**
   * Opciones del select (sólo cuando `field.kind === 'select'`).
   * Se acepta una colección de readonly y se expone como `dropdownOptions`
   * (no readonly) para `p-dropdown.options` que espera `any[]`.
   */
  @Input()
  set options(value: ReadonlyArray<BaseSelectOption>) {
    this.dropdownOptions = value as BaseSelectOption[];
  }
  /** Array consumido por el template de `p-dropdown`. */
  dropdownOptions: BaseSelectOption[] = [];

  /**
   * Bandera opcional para forzar que el control se considere `invalid` aunque
   * Angular aún no lo haya marcado (ej. envío fallido). No es necesaria en el
   * flujo normal.
   */
  @Input() forceInvalid = false;

  private readonly container = inject(ControlContainer);

  /** Tick interno: cambios en el control no disparan CD por sí mismos en OnPush. */
  private readonly _tick = signal(0);

  /** Control resuelto desde el `ControlContainer` padre. */
  readonly control = computed<AbstractControl | null>(() => {
    void this._tick();
    const parent = this.container.control;
    if (!parent || typeof (parent as { get?: unknown }).get !== 'function') return null;
    return (parent as unknown as { get: (k: string) => AbstractControl | null }).get(this.field.key);
  });

  /** Mensaje de error textual (o `null` si no procede mostrarlo). */
  readonly errorText = computed<string | null>(() => {
    void this._tick();
    const c = this.control();
    if (!c) return null;
    const shouldShow = c.invalid && (c.touched || this.forceInvalid) && !this.field.readonly;
    if (!shouldShow) return null;
    return resolveLocationFormError(c);
  });

  /** ¿Mostrar el hint de patrón? Sólo cuando el error es por `pattern`. */
  readonly showPatternHint = computed<boolean>(() => {
    void this._tick();
    const c = this.control();
    if (!c || !this.field.patternHint) return false;
    return c.touched && c.hasError('pattern');
  });

  /** ID HTML único para asociar label ↔ control. */
  readonly inputId = computed<string>(() => `${this.formIdPrefix}${this.field.key}`);

  /** Texto efectivo del placeholder (selectores reciben el placeholder estándar). */
  readonly effectivePlaceholder = computed<string>(() => {
    if (this.field.kind === 'select') {
      return this.field.placeholder ?? DEFAULT_SELECT_PLACEHOLDER;
    }
    return this.field.placeholder ?? '';
  });

  /** Indica si renderizar el bloque label/control (los hidden no se pintan). */
  readonly isVisible = computed<boolean>(() => this.field.kind !== 'hidden');

  /**
   * Bandera derivada: la franja roja del label sólo aparece cuando hay
   * un mensaje de error visible.
   */
  readonly labelInvalid = computed<boolean>(() => this.errorText() !== null);

  /** Notifica al template que recalcule estados derivados (uso desde eventos del control). */
  refresh(): void {
    this._tick.update((n) => n + 1);
  }
}
