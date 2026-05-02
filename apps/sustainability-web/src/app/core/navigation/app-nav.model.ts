/** Domain navigation item (no PrimeNG types) */
export interface AppNavItem {
  label: string;
  icon: string;
  route: string;
  /** Tooltip / doc: mutación GraphQL o alcance */
  description?: string;
}

export interface AppNavGroup {
  label: string;
  items: AppNavItem[];
}

export interface UserMenuLeaf {
  label: string;
  icon: string;
  routerLink?: string;
  badge?: string;
  styleClass?: string;
}

export interface UserMenuGroup {
  label: string;
  items: UserMenuLeaf[];
}

export type UserMenuSeparator = { separator: true };

export type UserMenuSpecial = {
  label: string;
  icon: string;
  routerLink?: string;
  styleClass?: string;
  action: 'signOut' | 'none';
};

export type UserMenuConfigEntry = UserMenuGroup | UserMenuSeparator | UserMenuSpecial;
