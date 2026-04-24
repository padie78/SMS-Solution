import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarModule } from 'primeng/sidebar';
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

  menuGroups = [
    {
      label: 'Real-Time Monitoring',
      items: [
        { label: 'Global Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard' },
        { label: 'IoT & Smart Metering', icon: 'pi pi-bolt', route: '/iot' },
        { label: 'Virtual Meters', icon: 'pi pi-calculator', route: '/virtual-meters' }
      ]
    },
    {
      label: 'AI & Strategy',
      items: [
        { label: 'Sustainability AI Chat', icon: 'pi pi-comments', route: '/ai-chat' },
        { label: 'Infra Simulator', icon: 'pi pi-map', route: '/simulator' },
        { label: 'Climate Risk Map', icon: 'pi pi-compass', route: '/climate-map' }
      ]
    },
    {
      label: 'Operations & Assets',
      items: [
        { label: 'Location Management', icon: 'pi pi-sitemap', route: '/assets' },
        { label: 'Action Plan (Kanban)', icon: 'pi pi-list', route: '/kanban' },
        { label: 'Supply Chain (Scope 3)', icon: 'pi pi-truck', route: '/supply-chain' }
      ]
    },
    {
      label: 'Data & Evidence',
      items: [
        { label: 'Invoice Intake', icon: 'pi pi-file-import', route: '/invoices' },
        { label: 'Bill Reconciliation', icon: 'pi pi-check-circle', route: '/reconciliation' },
        { label: 'Auditability Vault', icon: 'pi pi-lock', route: '/vault' }
      ]
    }
  ];

  toggle() {
    this.visible = !this.visible;
  }
}