import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { UiButtonComponent } from '../../../../ui/atoms/ui-button/ui-button.component';

/**
 * Barra estándar de acciones para formularios del Location Manager.
 *
 * Mantiene una sola fuente visual para Reset / Guardar / DTO preview,
 * evitando que cada form copie el mismo bloque de botones.
 */
@Component({
  selector: 'sms-location-form-actions',
  standalone: true,
  imports: [UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex w-full flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
      <ui-button
        type="button"
        variant="primary"
        icon="pi pi-refresh"
        label="Reset"
        [disabled]="!dirty"
        (clicked)="resetRequested.emit()"
      />
      <ui-button
        type="button"
        variant="primary"
        icon="pi pi-save"
        label="Guardar"
        [disabled]="invalid || !dirty"
        (clicked)="saveRequested.emit()"
      />
      <ui-button
        type="button"
        variant="secondary"
        icon="pi pi-code"
        label="DTO preview"
        (clicked)="previewRequested.emit()"
      />
    </div>
  `
})
export class LocationFormActionsComponent {
  @Input() dirty = false;
  @Input() invalid = false;

  @Output() resetRequested = new EventEmitter<void>();
  @Output() saveRequested = new EventEmitter<void>();
  @Output() previewRequested = new EventEmitter<void>();
}
