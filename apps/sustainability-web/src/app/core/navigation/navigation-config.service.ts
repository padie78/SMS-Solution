import { Injectable } from '@angular/core';
import { MENU_GROUPS, USER_MENU_CONFIG } from './menu-data';
import type { AppNavGroup, UserMenuConfigEntry } from './app-nav.model';

@Injectable({ providedIn: 'root' })
export class NavigationConfigService {
  getMenuGroups(): readonly AppNavGroup[] {
    return MENU_GROUPS;
  }

  getUserMenuConfig(): readonly UserMenuConfigEntry[] {
    return USER_MENU_CONFIG;
  }
}
