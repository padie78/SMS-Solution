import { Injectable, signal } from '@angular/core';

const SS_BRANCH = 'sms.setup.branchId';
const SS_BUILDING = 'sms.setup.buildingId';

/**
 * IDs frecuentes al dar de alta jerarquía (sincronizado con sessionStorage).
 * Tras crear sucursal/edificio, el shell de setup puede persistir aquí los defaults.
 */
@Injectable({ providedIn: 'root' })
export class SetupContextService {
  readonly branchId = signal(this.readSs(SS_BRANCH));
  readonly buildingId = signal(this.readSs(SS_BUILDING));

  private readSs(key: string): string {
    if (typeof sessionStorage === 'undefined') {
      return '';
    }
    return sessionStorage.getItem(key) ?? '';
  }

  setBranchId(id: string): void {
    const v = id.trim();
    this.branchId.set(v);
    sessionStorage.setItem(SS_BRANCH, v);
  }

  setBuildingId(id: string): void {
    const v = id.trim();
    this.buildingId.set(v);
    sessionStorage.setItem(SS_BUILDING, v);
  }
}
