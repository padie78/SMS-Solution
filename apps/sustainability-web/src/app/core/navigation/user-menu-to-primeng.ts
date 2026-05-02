import type { MenuItem } from 'primeng/api';
import type { UserMenuConfigEntry, UserMenuGroup, UserMenuSeparator, UserMenuSpecial } from './app-nav.model';

function isSeparator(entry: UserMenuConfigEntry): entry is { separator: true } {
  return 'separator' in entry && entry.separator === true;
}

function isGroup(entry: UserMenuConfigEntry): entry is UserMenuGroup {
  return 'items' in entry && Array.isArray((entry as UserMenuGroup).items);
}

function isSpecial(
  entry: UserMenuConfigEntry
): entry is UserMenuSpecial {
  return 'action' in entry;
}

/**
 * Maps domain user menu config to PrimeNG MenuItem[], wiring runtime commands (e.g. sign out).
 */
export function userMenuConfigToPrimeMenuItems(
  entries: readonly UserMenuConfigEntry[],
  handlers: { onSignOut: () => void | Promise<void> }
): MenuItem[] {
  const out: MenuItem[] = [];

  for (const entry of entries) {
    if (isSeparator(entry)) {
      out.push({ separator: true });
      continue;
    }

    if (isGroup(entry)) {
      out.push({
        label: entry.label,
        items: entry.items.map((i) => ({
          label: i.label,
          icon: i.icon,
          routerLink: i.routerLink,
          badge: i.badge,
          styleClass: i.styleClass
        }))
      });
      continue;
    }

    // Special row (Labs or Sign Out)
    if (isSpecial(entry) && entry.action === 'signOut') {
      out.push({
        label: entry.label,
        icon: entry.icon,
        command: () => {
          void handlers.onSignOut();
        }
      });
    } else {
      if (!isSpecial(entry)) {
        continue;
      }
      out.push({
        label: entry.label,
        icon: entry.icon,
        routerLink: entry.routerLink,
        styleClass: entry.styleClass
      });
    }
  }

  return out;
}
