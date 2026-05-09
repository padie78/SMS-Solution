import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Icono de ayuda (`pi pi-question-circle`) con `pTooltip` informativo.
 *
 * Se diseñó para ir al lado del label de los formularios SMS:
 *   <label>Centro de costo<ui-help-tip text="..." /></label>
 *
 * Reglas de UX:
 * - No empuja el control hacia abajo: usa `inline-flex` y márgen lateral (`ml-2`).
 * - Color sutil por defecto, `hover:text-blue-500` para feedback.
 * - Cursor `pointer` y `tabindex=0` para que sea accesible por teclado.
 * - `showDelay` configurable (200ms por defecto) para no molestar en hovers rápidos.
 *
 * Si `text` está vacío/undefined, no renderiza nada (evita ruido visual).
 */
export type UiHelpTipPosition = 'top' | 'right' | 'bottom' | 'left';

@Component({
  selector: 'ui-help-tip',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <i
      *ngIf="text"
      class="pi pi-question-circle ml-2 text-sm text-gray-400 hover:text-blue-500 cursor-pointer transition-colors align-middle"
      [pTooltip]="text"
      [tooltipPosition]="position"
      [showDelay]="showDelay"
      [hideDelay]="80"
      [escape]="false"
      [appendTo]="'body'"
      tabindex="0"
      role="img"
      [attr.aria-label]="ariaLabel ?? text"
    ></i>
  `
})
export class UiHelpTipComponent {
  /** Texto que se muestra al hacer hover sobre el icono. Si es vacío no se renderiza. */
  @Input() text: string | null | undefined = '';
  /** Posición del tooltip de PrimeNG. Default: `right`. */
  @Input() position: UiHelpTipPosition = 'right';
  /** Delay de aparición en ms para evitar mostrar en hovers casuales. */
  @Input() showDelay = 200;
  /** Override de `aria-label`; por defecto reutiliza `text`. */
  @Input() ariaLabel?: string;
}
