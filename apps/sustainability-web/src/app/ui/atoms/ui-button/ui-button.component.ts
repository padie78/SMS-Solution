import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Variantes del átomo de botón (respeta el sistema de tokens en `styles.css`).
 * - `primary`   → verde esmeralda + texto blanco (acción principal, ej. Guardar).
 * - `secondary` → blanco + borde slate (acciones secundarias, ej. DTO preview).
 * - `ghost`    → transparente (acciones discretas).
 */
export type UiButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Átomo de botón unificado para toda la app.
 *
 * Soporta ícono + label vía Inputs **y** contenido proyectado para casos
 * complejos (ej. spinners, badges anidados).
 *
 * @example
 *   <ui-button variant="primary" icon="pi pi-save" label="Guardar"
 *              [disabled]="form.invalid" (clicked)="save()" />
 */
@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [attr.type]="type"
      [disabled]="disabled"
      [class]="buttonClass"
      (click)="clicked.emit($event)"
    >
      @if (icon) {
        <i [class]="icon" aria-hidden="true"></i>
      }
      @if (label) {
        <span>{{ label }}</span>
      }
      <ng-content></ng-content>
    </button>
  `
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() variant: UiButtonVariant = 'primary';
  /** Clase de PrimeIcon (ej. `'pi pi-save'`). Se renderiza antes del label. */
  @Input() icon: string | null = null;
  /** Texto del botón. Si se omite, se usa el `<ng-content>` proyectado. */
  @Input() label: string | null = null;

  @Output() clicked = new EventEmitter<MouseEvent>();

  get buttonClass(): string {
    return `ui-button ui-button--${this.variant}`;
  }
}
