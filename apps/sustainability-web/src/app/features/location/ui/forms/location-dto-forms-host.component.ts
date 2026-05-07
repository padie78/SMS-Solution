import { CommonModule } from '@angular/common';
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
    CommonModule,
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
    <ng-container *ngIf="node as n">
      <sms-organization-form *ngIf="n.type === 'ORGANIZATION'" [parentNode]="n" />
      <sms-region-form *ngIf="n.type === 'REGION'" [parentNode]="n" />
      <sms-branch-form *ngIf="n.type === 'BRANCH'" [parentNode]="n" />
      <sms-building-form *ngIf="n.type === 'BUILDING'" [parentNode]="n" />
      <sms-cost-center-form *ngIf="n.type === 'COST_CENTER'" [parentNode]="n" />
      <sms-asset-form *ngIf="n.type === 'ASSET'" [parentNode]="n" />
      <sms-meter-form *ngIf="n.type === 'METER'" [parentNode]="n" />
    </ng-container>
  `
})
export class LocationDtoFormsHostComponent {
  @Input({ required: true }) node!: SmsLocationNode;
}

