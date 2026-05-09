import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { SmsLocationNode } from '../../../../core/models/sms-location-node.model';
import { OrganizationFormComponent } from './organization-form.component';
import { RegionFormComponent } from './region-form.component';
import { BranchFormComponent } from './branch-form.component';
import { BuildingFormComponent } from './building-form.component';
import { CostCenterFormComponent } from './cost-center-form.component';
import { AssetFormComponent } from './asset-form.component';
import { MeterFormComponent } from './meter-form.component';

@Component({
  selector: 'sms-location-dto-forms-host',
  standalone: true,
  imports: [
    OrganizationFormComponent,
    RegionFormComponent,
    BranchFormComponent,
    BuildingFormComponent,
    CostCenterFormComponent,
    AssetFormComponent,
    MeterFormComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (n of node ? [node] : []; track n.location_id) {
      @switch (n.type) {
        @case ('ORGANIZATION') {
          <sms-organization-form [parentNode]="n" />
        }
        @case ('REGION') {
          <sms-region-form [parentNode]="n" />
        }
        @case ('BRANCH') {
          <sms-branch-form [parentNode]="n" />
        }
        @case ('BUILDING') {
          <sms-building-form [parentNode]="n" />
        }
        @case ('COST_CENTER') {
          <sms-cost-center-form [parentNode]="n" />
        }
        @case ('ASSET') {
          <sms-asset-form [parentNode]="n" />
        }
        @case ('METER') {
          <sms-meter-form [parentNode]="n" />
        }
      }
    }
  `
})
export class LocationDtoFormsHostComponent {
  @Input({ required: true }) node!: SmsLocationNode;
}

