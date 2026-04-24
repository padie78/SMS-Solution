import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// PrimeNG Critical Imports
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    MenuModule,   // Crucial para <p-menu>
    BadgeModule   // Crucial para los badges (PRO, 1.2k)
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  userConfigItems: MenuItem[] = [
    {
      label: 'Personal',
      items: [
        { label: 'User Profile', icon: 'pi pi-user-edit', routerLink: '/profile' },
        { label: 'Preferences', icon: 'pi pi-sliders-h', routerLink: '/settings/preferences' },
        { label: 'Notifications', icon: 'pi pi-bell', routerLink: '/settings/notifications' }
      ]
    },
    {
      label: 'Workspaces & Admin',
      items: [
        { label: 'Location Management', icon: 'pi pi-map-marker', routerLink: '/admin/locations' },
        { label: 'Users & Access', icon: 'pi pi-users', routerLink: '/admin/users' },
        { label: 'Audit Logs', icon: 'pi pi-history', routerLink: '/admin/logs' }
      ]
    },
    {
      label: 'Billing & Quotas',
      items: [
        { 
          label: 'Plan & Subscription', 
          icon: 'pi pi-credit-card', 
          badge: 'PRO', 
          routerLink: '/billing/plan' 
        },
        { 
          label: 'Carbon Credits', 
          icon: 'pi pi-cloud', 
          badge: '1.2k', 
          routerLink: '/billing/credits' 
        },
        { label: 'API / IoT Usage', icon: 'pi pi-bolt', routerLink: '/billing/usage' }
      ]
    },
    { separator: true },
    { 
      label: 'Labs & Beta Features', 
      icon: 'pi pi-flask', 
      routerLink: '/labs',
      styleClass: 'text-emerald-600 font-bold' 
    },
    { 
      label: 'Sign Out', 
      icon: 'pi pi-sign-out', 
      command: () => this.logout() 
    }
  ];

  logout() {
    // Aquí integrarás Amplify Auth.signOut()
    console.log('Logging out...');
  }
}