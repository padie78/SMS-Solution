import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { buildInvoiceSuccessCo2GaugeOption } from '../../../features/invoice-onboarding/lib/invoice-onboarding-success-chart';
import { InvoiceOnboardingUiService } from '../../../features/invoice-onboarding/services/invoice-onboarding-ui.service';
import { NavigationService } from '../../../services/utils/navigation.service';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';

@Component({
  selector: 'app-invoice-onboarding-success-panel',
  standalone: true,
  imports: [ButtonModule, EchartsNativePaneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center text-center gap-5 md:gap-6 py-6 md:py-8 px-5 md:px-8 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-lg mx-auto"
    >
      <div
        class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"
      >
        <i class="pi pi-check text-3xl" aria-hidden="true"></i>
      </div>
      <div>
        <h2 class="m-0 text-2xl md:text-3xl font-black text-slate-900">Procesado con éxito</h2>
        <p class="m-0 mt-2 text-slate-500 text-sm leading-relaxed mx-auto max-w-md">
          Impacto estimado de la factura en términos de emisiones de CO₂e (factor mock operativo).
        </p>
      </div>
      <div class="w-full max-w-sm mx-auto rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm h-[268px]">
        @if (chartOpts(); as opts) {
          <app-echarts-native-pane [options]="opts" [hostHeightPx]="252" />
        }
      </div>
      <p-button
        label="Finalizar e ir a Gestión de Facturas"
        icon="pi pi-table"
        styleClass="p-button-emerald rounded-xl text-xs font-bold px-6"
        (onClick)="goManager()"
      />
    </div>
  `
})
export class InvoiceOnboardingSuccessPanelComponent {
  private readonly router = inject(Router);
  private readonly nav = inject(NavigationService);
  readonly onboarding = inject(InvoiceOnboardingUiService);

  readonly chartOpts = computed(() =>
    buildInvoiceSuccessCo2GaugeOption(this.onboarding.successCo2eKg())
  );

  goManager(): void {
    void this.router.navigateByUrl(this.nav.path('complianceInvoices'));
  }
}
