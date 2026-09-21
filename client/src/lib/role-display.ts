import type { TFunction } from "i18next";

const SYSTEM_ROLE_NAMES = ["Super Admin", "Admin", "Manager", "HR", "Employee", "Accountant", "Viewer"] as const;

export function isSystemRoleName(name: string): boolean {
  return (SYSTEM_ROLE_NAMES as readonly string[]).includes(name);
}

export function translateRoleName(name: string, t: TFunction): string {
  return isSystemRoleName(name) ? t(`roles.systemNames.${name}`) : name;
}
