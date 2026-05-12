import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../../../../ui/atoms/ui-button/ui-button.component';

/**
 * Barra estándar de acciones para los formularios del Location Manager.
 *
 * Reglas UX:
 *  - **Guardar** queda deshabilitado mientras el formulario sea inválido o no tenga cambios
 *    pendientes (dirty=false). Cuando bloqueado, una pista textual explica el motivo.
 *  - **Reset** sólo se habilita cuando hay cambios pendientes (dirty=true).
 *  - **DTO preview** siempre disponible (acción secundaria, no muta el form).
 *
 * Mantiene la API previa (Inputs/Outputs) para que los formularios existentes no se rompan.
 */
@Component({
  selector: 'sms-location-form-actions',
  standalone: true,
  imports: [CommonModule, UiButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex w-full flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div
        class="flex min-h-[20px] items-center text-[11px] font-medium text-slate-500"
        role="status"
        aria-live="polite"
      >
        @if (saveDisabled && hint) {
          <span class="inline-flex items-center gap-1.5">
            <i class="pi pi-info-circle text-slate-400" aria-hidden="true"></i>
            <span>{{ hint }}</span>
          </span>
        }
      </div>

      <div class="flex flex-wrap justify-end gap-2">
        <ui-button
          type="button"
          variant="ghost"
          icon="pi pi-code"
          label="Vista DTO"
          (clicked)="previewRequested.emit()"
        />
        <ui-button
          type="button"
          variant="secondary"
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
          [disabled]="saveDisabled"
          (clicked)="saveRequested.emit()"
        />
      </div>
    </div>
  `
})
export class LocationFormActionsComponent {
  @Input() dirty = false;
  @Input() invalid = false;

  @Output() resetRequested = new EventEmitter<void>();
  @Output() saveRequested = new EventEmitter<void>();
  @Output() previewRequested = new EventEmitter<void>();

  get saveDisabled(): boolean {
    return this.invalid || !this.dirty;
  }

  get hint(): string | null {
    if (this.invalid) return 'Completa los campos obligatorios para habilitar Guardar.';
    if (!this.dirty) return 'No hay cambios sin guardar.';
    return null;
  }
}
