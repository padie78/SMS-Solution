import { Injectable } from '@angular/core';
import { USER_MENU_CONFIG } from './menu-data';
import type { UserMenuConfigEntry } from './app-nav.model';

@Injectable({ providedIn: 'root' })
export class NavigationConfigService {
  getUserMenuConfig(): readonly UserMenuConfigEntry[] {
    return USER_MENU_CONFIG;
  }
}
