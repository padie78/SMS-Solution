import { Component, OnInit, inject, signal } from '@angular/core';
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
  styleUrls: ['./shell-header.component.scss']
})
export class ShellHeaderComponent implements OnInit {
  private readonly navMenu = inject(NavigationConfigService);
  private readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);
  private readonly logger = inject(LoggerService);

  readonly dashboardPath = this.navigation.path('dashboard');

  readonly userName = signal('…');
  readonly userRole = signal('…');
  readonly userEmail = signal('');
  readonly userInitials = signal('—');

  readonly userConfigItems: MenuItem[] = userMenuConfigToPrimeMenuItems(this.navMenu.getUserMenuConfig(), {
    onSignOut: async () => {
      try {
        await this.auth.signOut();
      } catch (e) {
        this.logger.error('Sign out failed', e);
      }
    }
  });

  ngOnInit(): void {
    void this.hydrateUser();
  }

  private async hydrateUser(): Promise<void> {
    const p = await this.auth.getUserDisplayProfile();
    this.userName.set(p.displayName);
    this.userRole.set(p.roleLabel);
    this.userEmail.set(p.email);
    const parts = p.displayName.trim().split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
        : (parts[0]?.slice(0, 2).toUpperCase() ?? '—');
    this.userInitials.set(initials || '—');
  }
}
