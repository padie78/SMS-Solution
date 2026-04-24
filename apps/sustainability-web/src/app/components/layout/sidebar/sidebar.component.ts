import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarModule } from 'primeng/sidebar';
import { PanelMenuModule } from 'primeng/panelmenu'; // Opcional para acordeones
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  visible: boolean = false;

  // Estructura del Menú V3
  menuGroups = [
    {
      label: '1. MONITORING & INSIGHTS',
      items: [
        { label: 'Global Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard' },
        { label: 'Smart Metering & IoT', icon: 'pi pi-bolt', route: '/iot' },
        { label: 'Virtual Meters Config', icon: 'pi pi-calculator', route: '/virtual-meters' },
        { label: 'Alerts & Incidents', icon: 'pi pi-exclamation-triangle', route: '/alerts' }
      ]
    },
    {
      label: '2. AI & CLIMATE INTEL',
      items: [
        { label: 'Sustainability AI Chat', icon: 'pi pi-comments', route: '/ai-chat' },
        { label: 'Infra Simulator', icon: 'pi pi-map', route: '/simulator' },
        { label: 'Climate Risk Map', icon: 'pi pi-map-marker', route: '/climate-map' }
      ]
    },
    {
      label: '3. ASSET HEALTH',
      items: [
        { label: 'Anomaly Detection', icon: 'pi pi-search-minus', route: '/anomalies' },
        { label: 'Asset Benchmarking', icon: 'pi pi-clone', route: '/benchmarking' },
        { label: 'Maintenance Scheduler', icon: 'pi pi-calendar', route: '/maintenance' }
      ]
    },
    {
      label: '5. DATA & EVIDENCE',
      items: [
        { label: 'Invoice Intake', icon: 'pi pi-file-import', route: '/invoices' },
        { label: 'Invoice Reconciliation', icon: 'pi pi-check-square', route: '/reconciliation' },
        { label: 'Auditability Vault', icon: 'pi pi-lock', route: '/vault' }
      ]
    }
    // Puedes seguir agregando el resto de los 7 puntos aquí...
  ];

  toggle() {
    this.visible = !this.visible;
  }
}