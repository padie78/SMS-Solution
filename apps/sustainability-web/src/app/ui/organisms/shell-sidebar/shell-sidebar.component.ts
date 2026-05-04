import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import type { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { DropdownModule } from 'primeng/dropdown';
import { OperationalAlertsBadgeService } from '../../../services/state/operational-alerts-badge.service';
import { NavigationService, type SidebarNavSection } from '../../../services/utils/navigation.service';
import { SidenavLayoutService } from '../../layout/sidenav-layout.service';

interface WorkspaceOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-shell-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DropdownModule, BadgeModule],
  templateUrl: './shell-sidebar.component.html',
  styleUrls: ['./shell-sidebar.component.scss']
})
export class ShellSidebarComponent implements OnInit {
  private readonly router = inject(Router);
  readonly navigation = inject(NavigationService);
  readonly alertsBadge = inject(OperationalAlertsBadgeService);
  readonly sidenav = inject(SidenavLayoutService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly menuRevision = signal(0);

  drawerOpen = false;

  readonly navSections = signal<SidebarNavSection[]>([]);

  readonly workspaceOptions: WorkspaceOption[] = [{ label: 'Primary organization', value: 'default' }];
  readonly selectedWorkspace = signal<string>('default');

  constructor() {
    effect(
      () => {
        this.menuRevision();
        this.alertsBadge.activeCount();
        this.navSections.set(
          this.navigation.getSidebarSections({
            url: this.router.url,
            incidentBadgeCount: this.alertsBadge.activeCount()
          })
        );
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.drawerOpen = false;
        this.menuRevision.update((n) => n + 1);
      });
  }

  isActivePath(item: MenuItem): boolean {
    return this.navigation.isActivePath(this.router.url, item.routerLink);
  }

  toggleMobileDrawer(): void {
    if (!this.isMobileViewport()) return;
    this.drawerOpen = !this.drawerOpen;
  }

  closeMobileDrawer(): void {
    this.drawerOpen = false;
  }

  toggleCollapsedMode(): void {
    if (this.isMobileViewport()) return;
    this.sidenav.toggleCollapsed();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.isMobileViewport()) {
      this.drawerOpen = false;
    }
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }
}
