import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BadgeModule } from 'primeng/badge';
import { InvoiceOnboardingUiService } from '../../../features/invoice-onboarding/services/invoice-onboarding-ui.service';

@Component({
  selector: 'app-invoice-onboarding-gate',
  standalone: true,
  imports: [BadgeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gate-root">
      <div class="gate-intro">
        <h2 class="gate-heading">Método de ingesta</h2>
        <p class="gate-lead">
          Elige cómo cargar la factura de electricidad, agua o gas. Ambas rutas comparten el mismo stepper de cuatro pasos.
        </p>
      </div>

      <div class="invoice-gate-grid">
        <div
          role="button"
          tabindex="0"
          class="invoice-gate-card invoice-gate-card--ocr gate-panel"
          (click)="chooseOcr()"
          (keydown.enter)="chooseOcr()"
        >
          <div class="gate-panel-inner">
            <div class="gate-panel-header">
              <div class="gate-title-row">
                <span class="gate-icon gate-icon--ocr" aria-hidden="true">
                  <i class="pi pi-sparkles"></i>
                </span>
                <div class="gate-title-block">
                  <p class="gate-eyebrow gate-eyebrow--ocr">Recomendado</p>
                  <h3 class="gate-title">Carga inteligente (OCR)</h3>
                </div>
              </div>
              <span class="gate-badge-wrap">
                <p-badge value="IA" severity="success" />
              </span>
            </div>
            <p class="gate-body">
              Extracción asistida, campos sugeridos y validación acelerada. Ideal para PDF estándar de utilities.
            </p>
            <span class="gate-cta gate-cta--ocr">Continuar con OCR →</span>
          </div>
        </div>

        <div
          role="button"
          tabindex="0"
          class="invoice-gate-card gate-panel gate-panel--manual"
          (click)="chooseManual()"
          (keydown.enter)="chooseManual()"
        >
          <div class="gate-panel-inner">
            <div class="gate-panel-header gate-panel-header--manual">
              <div class="gate-title-row">
                <span class="gate-icon gate-icon--manual" aria-hidden="true">
                  <i class="pi pi-pencil"></i>
                </span>
                <div class="gate-title-block">
                  <h3 class="gate-title">Carga tradicional (manual)</h3>
                  <p class="gate-eyebrow gate-eyebrow--muted">Sin OCR</p>
                </div>
              </div>
            </div>
            <p class="gate-body">
              Visor PDF + formulario reactivo. Control total cuando el documento no sigue plantillas habituales.
            </p>
            <span class="gate-cta">Continuar en manual →</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        max-width: 100%;
      }

      .gate-root {
        min-width: 0;
        max-width: 100%;
      }

      .gate-intro {
        margin-bottom: 1.25rem;
      }

      @media (min-width: 768px) {
        .gate-intro {
          margin-bottom: 1.5rem;
        }
      }

      .gate-heading {
        margin: 0 0 0.75rem;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #475569;
      }

      @media (min-width: 768px) {
        .gate-heading {
          margin-bottom: 1rem;
        }
      }

      .gate-lead {
        margin: 0;
        max-width: 42rem;
        font-size: 0.875rem;
        line-height: 1.6;
        color: #475569;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .invoice-gate-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
        min-width: 0;
      }

      @media (min-width: 640px) {
        .invoice-gate-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
        }
      }

      .gate-panel {
        min-width: 0;
        max-width: 100%;
        border-radius: 0.75rem;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        cursor: pointer;
        text-align: left;
        outline: none;
        transition: box-shadow 0.2s ease;
      }

      .gate-panel:hover {
        box-shadow:
          0 4px 6px -1px rgb(0 0 0 / 0.07),
          0 2px 4px -2px rgb(0 0 0 / 0.07);
      }

      .gate-panel:focus-visible {
        box-shadow: 0 0 0 2px #fff, 0 0 0 4px #10b981;
      }

      .gate-panel--manual {
        border: 1px solid #e2e8f0;
        background: #fff;
      }

      .gate-panel-inner {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
        padding: 1.1rem 1.1rem 1.25rem;
      }

      @media (min-width: 640px) {
        .gate-panel-inner {
          padding: 1.25rem 1.35rem 1.35rem;
        }
      }

      .gate-panel-header {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem 0.75rem;
        width: 100%;
        min-width: 0;
      }

      .gate-panel-header--manual {
        justify-content: flex-start;
      }

      .gate-title-row {
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        min-width: 0;
        flex: 1 1 auto;
      }

      .gate-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 9999px;
        flex-shrink: 0;
        font-size: 1rem;
      }

      @media (min-width: 640px) {
        .gate-icon {
          width: 2.75rem;
          height: 2.75rem;
          font-size: 1.05rem;
        }
      }

      .gate-icon--ocr {
        background: #10b981;
        color: #fff;
      }

      .gate-icon--manual {
        background: #f1f5f9;
        color: #334155;
      }

      .gate-title-block {
        min-width: 0;
        flex: 1 1 auto;
      }

      .gate-eyebrow {
        margin: 0;
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .gate-eyebrow--ocr {
        color: #047857;
      }

      .gate-eyebrow--muted {
        color: #64748b;
        margin-top: 0.25rem;
      }

      .gate-title {
        margin: 0.2rem 0 0;
        font-size: 1.05rem;
        font-weight: 900;
        line-height: 1.25;
        color: #0f172a;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      @media (min-width: 640px) {
        .gate-title {
          font-size: 1.15rem;
        }
      }

      .gate-badge-wrap {
        display: inline-flex;
        flex-shrink: 0;
        align-self: flex-start;
        max-width: 100%;
      }

      .gate-badge-wrap p-badge {
        display: inline-flex;
        max-width: 100%;
      }

      .gate-body {
        margin: 0;
        width: 100%;
        max-width: 100%;
        font-size: 0.875rem;
        line-height: 1.55;
        color: #475569;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .gate-cta {
        display: inline-block;
        width: fit-content;
        max-width: 100%;
        margin-top: 0.15rem;
        font-size: 0.75rem;
        font-weight: 700;
        color: #475569;
        overflow-wrap: anywhere;
      }

      .gate-cta--ocr {
        color: #047857;
      }

      .invoice-gate-card--ocr {
        background: linear-gradient(135deg, rgba(236, 253, 245, 0.96), rgba(255, 255, 255, 0.98));
        border: 1px solid rgba(16, 185, 129, 0.38);
        position: relative;
        overflow: hidden;
      }

      .invoice-gate-card--ocr::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: radial-gradient(ellipse 120% 90% at 0% 0%, rgba(52, 211, 153, 0.2), transparent 55%);
        pointer-events: none;
      }
    `
  ]
})
export class InvoiceOnboardingGateComponent {
  readonly onboarding = inject(InvoiceOnboardingUiService);

  chooseOcr(): void {
    this.onboarding.selectOcrPath();
    this.onboarding.passGate();
  }

  chooseManual(): void {
    this.onboarding.selectManualPath();
    this.onboarding.passGate();
  }
}
