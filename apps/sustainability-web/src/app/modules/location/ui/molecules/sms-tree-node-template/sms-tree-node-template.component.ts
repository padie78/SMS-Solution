import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { SmsLocationNode } from '../../../../../core/models/sms-location-node.model';
import { SmsIconAtomComponent } from '../../atoms/sms-icon-atom/sms-icon-atom.component';
import { SmsStatusBadgeComponent } from '../../atoms/sms-status-badge/sms-status-badge.component';

@Component({
  selector: 'sms-tree-node-template',
  standalone: true,
  imports: [CommonModule, SmsIconAtomComponent, SmsStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex align-items-center gap-2 w-full">
      <sms-icon-atom [type]="node.type" />
      <div class="flex flex-column flex-1 min-w-0">
        <div class="text-slate-900 font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis">
          {{ node.name }}
        </div>
        <div class="text-slate-500 text-xs font-bold uppercase tracking-wider white-space-nowrap overflow-hidden text-overflow-ellipsis">
          {{ node.type }} · {{ node.location_id }}
        </div>
      </div>
      <div class="flex align-items-center gap-2">
        <sms-status-badge [status]="node.status" />
      </div>
    </div>
  `
})
export class SmsTreeNodeTemplateComponent {
  @Input({ required: true }) node!: SmsLocationNode;
}

