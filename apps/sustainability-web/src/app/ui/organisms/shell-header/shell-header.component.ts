import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import type { MenuItem } from 'primeng/api';
import { NavigationConfigService } from '../../../core/navigation/navigation-config.service';
import { userMenuConfigToPrimeMenuItems } from '../../../core/navigation/user-menu-to-primeng';
import { AuthService } from '../../../services/infrastructure/auth.service';
import { NavigationService } from '../../../services/utils/navigation.service';
import { LoggerService } from '../../../services/utils/logger.service';

@Component({
  selector: 'app-shell-header',
  standalone: true,
  imports: [CommonModule, RouterLink, MenuModule, BadgeModule],
  templateUrl: './shell-header.component.html',
  styleUrls: ['./shell-header.component.css']
})
export class ShellHeaderComponent {
  @Output() readonly toggleSidebar = new EventEmitter<void>();

  private readonly navMenu = inject(NavigationConfigService);
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);
  private readonly logger = inject(LoggerService);

  readonly dashboardPath = this.navigation.path('dashboard');

  readonly userConfigItems: MenuItem[] = userMenuConfigToPrimeMenuItems(this.navMenu.getUserMenuConfig(), {
    onSignOut: async () => {
      try {
        await this.auth.signOut();
      } catch (e) {
        this.logger.error('Sign out failed', e);
      }
    }
  });
}
