import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'sms.sidebar.isCollapsed';
const LEGACY_COMPACT_KEY = 'sms.sidebar.compact';

/**
 * Shared desktop sidebar width (250px expanded / 80px rail) for fixed sidenav + main inset.
 */
@Injectable({ providedIn: 'root' })
export class SidenavLayoutService {
  static readonly expandedWidthPx = 250;
  static readonly collapsedWidthPx = 80;

  readonly isCollapsed = signal(this.readInitialCollapsed());

  expandedWidth(): number {
    return SidenavLayoutService.expandedWidthPx;
  }

  collapsedWidth(): number {
    return SidenavLayoutService.collapsedWidthPx;
  }

  sidebarWidthPx(): number {
    return this.isCollapsed() ? SidenavLayoutService.collapsedWidthPx : SidenavLayoutService.expandedWidthPx;
  }

  /** Main content left inset on `md+` (mobile uses full width). */
  mainInsetLeftPx(): number {
    return this.sidebarWidthPx();
  }

  toggleCollapsed(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    }
  }

  private readInitialCollapsed(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
    return localStorage.getItem(LEGACY_COMPACT_KEY) === '1';
  }
}
