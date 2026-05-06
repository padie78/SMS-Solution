import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { SmsLocationNodeType } from '../../../core/models/sms-location-node.model';

function iconForType(type: SmsLocationNodeType): string {
  switch (type) {
    case 'ORGANIZATION':
      return 'pi pi-building';
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
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <i [ngClass]="iconClasses" class="text-base"></i> `
})
export class LocationIconAtomComponent {
  @Input({ required: true }) type!: SmsLocationNodeType;

  get iconClasses(): string[] {
    const icon = iconForType(this.type);
    const tone =
      this.type === 'ORGANIZATION'
        ? 'text-emerald-700'
        : this.type === 'REGION'
          ? 'text-blue-600'
          : this.type === 'BRANCH'
            ? 'text-slate-700'
            : this.type === 'BUILDING'
              ? 'text-indigo-600'
              : this.type === 'COST_CENTER'
                ? 'text-amber-700'
                : this.type === 'ASSET'
                  ? 'text-zinc-700'
                  : this.type === 'METER'
                    ? 'text-emerald-700'
                    : 'text-slate-500';
    return [...icon.split(' '), tone];
  }
}

