/**
 * Infraestructura compartida para los formularios del Location Manager.
 *
 * Centraliza:
 *  - El **placeholder estándar** de los selectores (`-- Seleccione una opción --`).
 *  - La **forma estructural** mínima que cumplen todas las `*FormFieldDef`
 *    (organization / region / branch / building / asset / meter / cost-center / tariff).
 *  - El **constructor genérico de FormGroup** (`buildLocationFormGroup`) que:
 *      1. Aplica los validadores declarativos por field def.
 *      2. Para los `select` requeridos no de sólo lectura: fuerza `null` como
 *         valor inicial (control nullable) para que el dropdown muestre el
 *         placeholder en lugar de auto-seleccionar la primera opción del enum.
 *  - El **resolutor común de mensajes de error** (`resolveLocationFormError`).
 *  - El mapa **mdCols → Tailwind grid class** (`LOCATION_FORM_GRID_CLASS`).
 *
 * Mantener este archivo como única fuente de verdad para la UX de formularios
 * en `features/location/ui/forms/`.
 */

import { Validators, type AbstractControl, type FormBuilder, type FormGroup, type ValidatorFn, type ValidationErrors } from '@angular/forms';

/** Texto canónico del primer ítem (placeholder) en todos los selectores. */
export const DEFAULT_SELECT_PLACEHOLDER = '-- Seleccione una opción --';

/** Tipos de campo soportados por el renderer compartido (`sms-location-form-field`). */
export type BaseLocationFormFieldKind =
  | 'hidden'
  | 'text'
  | 'email'
  | 'url'
  | 'textarea'
  | 'integer'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'date';

/** Anchos disponibles para el sistema de columnas (md: 4/6/8/12). */
export type BaseLocationFormFieldCols = 4 | 6 | 8 | 12;

/** Opción genérica para selectores. Las `SelectOption<T>` específicas la cumplen estructuralmente. */
export interface BaseSelectOption {
  readonly label: string;
  readonly value: string;
}

/**
 * Forma estructural mínima a la que se ajustan todas las `*FormFieldDef`
 * existentes. Permite que el componente compartido y los helpers funcionen
 * sin acoplarse al type específico de cada formulario.
 */
export interface BaseLocationFormFieldDef {
  readonly key: string;
  readonly label: string;
  readonly kind: BaseLocationFormFieldKind;
  readonly mdCols: BaseLocationFormFieldCols;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly patternRegex?: RegExp;
  readonly patternHint?: string;
  readonly help?: string;
}

/**
 * Mapa mdCols → clase para el grid de 12 columnas del location manager.
 *
 * Reemplazamos los breakpoints viewport-based de Tailwind (`md:col-span-X`)
 * por clases custom `sms-col-span-N` que se evalúan vía
 * **container queries** del wrapper `.sms-form-grid` definidas en
 * `styles.css`. Así el reparto de columnas se adapta al ancho REAL del
 * panel donde vive el form (no al viewport), evitando que un panel
 * derecho angosto rompa el layout cuando el árbol está expandido.
 */
export const LOCATION_FORM_GRID_CLASS: Readonly<Record<BaseLocationFormFieldCols, string>> = Object.freeze({
  4: 'sms-col-span-4',
  6: 'sms-col-span-6',
  8: 'sms-col-span-8',
  12: 'sms-col-span-12'
});

/**
 * Indica si un campo SELECT debe renderizar el placeholder en lugar de
 * auto-elegir la primera opción del enum.
 *
 * Regla de producto (UX): **todos** los selectores no `readonly` deben
 * arrancar sin valor y mostrar el placeholder canónico `-- Seleccione una
 * opción --`. Esto garantiza que el usuario tome una decisión explícita y
 * evita que un “primer ítem” se persista por accidente. Si el select es
 * además `required`, el FormGroup encadenará `Validators.required`
 * (ver `ensureRequiredForPlaceholderSelect`).
 */
export function shouldUsePlaceholderForSelect(field: BaseLocationFormFieldDef): boolean {
  return field.kind === 'select' && field.readonly !== true;
}

/**
 * Parámetros de construcción de un FormGroup declarativo.
 *
 * - `fieldDefs`: lista plana de field defs (flatMap de las tabs).
 * - `defaults`: valores por defecto del FormValue (no nullable salvo los marcados).
 * - `nullableFields`: claves cuyo control debe ser construido como **nullable**
 *   con `fb.control` (en lugar de `fb.nonNullable.control`).
 * - `getValidators`: función que produce los validadores por field def.
 */
export interface BuildLocationFormGroupParams<F extends BaseLocationFormFieldDef> {
  readonly fb: FormBuilder;
  readonly fieldDefs: ReadonlyArray<F>;
  readonly defaults: Readonly<Record<string, unknown>>;
  readonly nullableFields: ReadonlySet<string>;
  readonly getValidators: (meta: F) => ValidatorFn[];
}

/**
 * Construye un FormGroup ya configurado para los formularios del location manager.
 *
 * Reglas:
 *  - Si el field está en `nullableFields` → control nullable con su default.
 *  - Si el field es un SELECT requerido (no readonly) → control nullable con
 *    **valor inicial `null`** y validador `required` garantizado. Esto fuerza
 *    al usuario a elegir explícitamente una opción del dropdown.
 *  - En cualquier otro caso → control **non-nullable** con su default.
 *
 * La función devuelve un FormGroup sin tipar (el caller hace el cast al
 * `*FormGroup` específico) para evitar genéricos cruzados que compliquen la
 * inferencia de TypeScript.
 */
export function buildLocationFormGroup<F extends BaseLocationFormFieldDef>(
  params: BuildLocationFormGroupParams<F>
): FormGroup {
  const { fb, fieldDefs, defaults, nullableFields, getValidators } = params;
  const fbnn = fb.nonNullable;
  const controls: Record<string, AbstractControl> = {};

  for (const meta of fieldDefs) {
    const key = meta.key;
    const initial = defaults[key];
    const validators = ensureRequiredForPlaceholderSelect(meta, getValidators(meta));
    const placeholderSelect = shouldUsePlaceholderForSelect(meta);

    if (nullableFields.has(key) || placeholderSelect) {
      const effectiveInitial = placeholderSelect ? null : (initial ?? null);
      controls[key] = fb.control(effectiveInitial as never, validators);
      continue;
    }

    controls[key] = fbnn.control(initial as never, validators);
  }

  return fb.group(controls) as FormGroup;
}

/**
 * Garantiza que los `select` declarativamente `required` tengan también
 * `Validators.required` registrado en el control (defensa en profundidad
 * frente a `getValidators` que pudiera omitirlo).
 *
 * Importante: los selects no `required` se quedan sin el validador aunque
 * arranquen con `null` (placeholder visible) — el formulario sigue siendo
 * `valid` con valor vacío.
 */
function ensureRequiredForPlaceholderSelect(
  field: BaseLocationFormFieldDef,
  validators: ValidatorFn[]
): ValidatorFn[] {
  if (field.kind !== 'select' || field.required !== true || field.readonly === true) {
    return validators;
  }
  return validators.includes(Validators.required) ? validators : [...validators, Validators.required];
}

/**
 * Mensaje de error genérico para los formularios del location manager.
 * Cubre los validators más comunes (`required`, `email`, `pattern`, `min`, `max`, `maxlength`).
 * Devuelve `null` si el control es válido o aún no fue tocado/dirtied (la decisión de
 * mostrar la franja roja la toma el template observando `touched && invalid`).
 */
export function resolveLocationFormError(control: AbstractControl | null): string | null {
  if (!control) return null;
  const errs = control.errors as ValidationErrors | null;
  if (!errs) return null;
  if (errs['required']) return 'Campo obligatorio.';
  if (errs['email']) return 'Introduce un email válido.';
  if (errs['pattern']) return 'El formato del valor no es válido.';
  if (errs['min']) {
    const min = (errs['min'] as { min?: number })?.min;
    return min !== undefined ? `Valor mínimo: ${min}.` : 'Valor por debajo del mínimo permitido.';
  }
  if (errs['max']) {
    const max = (errs['max'] as { max?: number })?.max;
    return max !== undefined ? `Valor máximo: ${max}.` : 'Valor por encima del máximo permitido.';
  }
  if (errs['maxlength']) {
    const len = (errs['maxlength'] as { requiredLength?: number })?.requiredLength;
    return len !== undefined ? `Máximo ${len} caracteres.` : 'Texto demasiado largo.';
  }
  if (errs['minlength']) {
    const len = (errs['minlength'] as { requiredLength?: number })?.requiredLength;
    return len !== undefined ? `Mínimo ${len} caracteres.` : 'Texto demasiado corto.';
  }
  return 'Valor inválido.';
}
