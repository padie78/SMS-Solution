import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarModule } from 'primeng/sidebar';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavigationConfigService } from '../../../core/navigation/navigation-config.service';
import type { AppNavGroup } from '../../../core/navigation/app-nav.model';

@Component({
  selector: 'app-shell-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarModule, RouterLink, RouterLinkActive],
  templateUrl: './shell-sidebar.component.html',
  styleUrls: ['./shell-sidebar.component.css']
})
export class ShellSidebarComponent {
  readonly navConfig = inject(NavigationConfigService);

  visible = false;

  get menuGroups(): readonly AppNavGroup[] {
    return this.navConfig.getMenuGroups();
  }

  toggle(): void {
    this.visible = !this.visible;
  }
}
