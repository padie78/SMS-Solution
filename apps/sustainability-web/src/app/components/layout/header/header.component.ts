import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-header',
  standalone: true,
  // Ensure you include these in your imports array
  // imports: [MenuModule, BadgeModule, AvatarModule, CommonModule, RouterLink]
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  
  // User configuration menu focused on Management, Credits, and Subscription
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
          badge: 'PRO', // You can bind this dynamically to the user's plan
          routerLink: '/billing/plan' 
        },
        { 
          label: 'Carbon Credits', 
          icon: 'pi pi-cloud', 
          badge: '1.2k', // Example of available credits
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
      styleClass: 'text-emerald-600' 
    },
    { 
      label: 'Sign Out', 
      icon: 'pi pi-sign-out', 
      command: () => this.logout() 
    }
  ];

  logout() {
    // Logic for AWS Amplify Auth.signOut()
    console.log('Logging out...');
  }
}