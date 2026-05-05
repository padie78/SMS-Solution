import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { SmsLocationNodeType } from '../../../../../core/models/sms-location-node.model';

function iconForType(type: SmsLocationNodeType): string {
  switch (type) {
    case 'REGION':
      return 'pi pi-globe';
    case 'BRANCH':
      return 'pi pi-building';
    case 'BUILDING':
      return 'pi pi-home';
    case 'COST_CENTER':
      return 'pi pi-wallet';
    case 'ASSET':
      return 'pi pi-cog';
    case 'METER':
      return 'pi pi-bolt';
    default:
      return 'pi pi-circle';
  }
}

@Component({
  selector: 'sms-icon-atom',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <i [class]="iconClass" class="text-sm text-slate-500"></i> `
})
export class SmsIconAtomComponent {
  @Input({ required: true }) type!: SmsLocationNodeType;

  get iconClass(): string {
    return iconForType(this.type);
  }
}

