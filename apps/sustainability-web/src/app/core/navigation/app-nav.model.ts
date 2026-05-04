/** Strategic pillar for expansion / analytics (maps to `/ops`, `/assets`, `/strategy`, `/compliance`). */
export type AppNavIntentKey = 'ops' | 'assets' | 'strategy' | 'compliance';

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
