import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TreeModule } from 'primeng/tree';

import type {
  AlertRuleCatalogRow,
  AssetCatalogRow,
  BranchCatalogRow,
  BuildingCatalogRow,
  CostCenterCatalogRow,
  HierarchyAdminTab,
  MeterCatalogRow,
  TariffCatalogRow
} from '../../core/models/hierarchy-catalog.model';
import { AppSyncApiService } from '../../services/infrastructure/appsync-api.service';
import { SetupApiService } from '../../services/infrastructure/setup-api.service';
import { HierarchyCatalogService } from '../../services/state/hierarchy-catalog.service';
import { SetupContextService } from '../../services/state/setup-context.service';
import { NotificationService } from '../../services/ui/notification.service';
import { SETUP_PAGE_REGISTRY, type SetupPageKey } from './setup-pages.registry';

@Component({
  selector: 'app-setup-hierarchy-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TreeModule,
    TabViewModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    InputTextModule
  ],
  providers: [ConfirmationService],
  templateUrl: './setup-hierarchy-admin.component.html',
  styleUrl: './setup-hierarchy-admin.component.css'
})
export class SetupHierarchyAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SetupApiService);
  private readonly appSync = inject(AppSyncApiService);
  private readonly hier = inject(HierarchyCatalogService);
  private readonly ctx = inject(SetupContextService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmationService);

  readonly tabLabels: Record<HierarchyAdminTab, string> = {
    branch: 'Sucursales',
    building: 'Edificios',
    'cost-center': 'Centros de costo',
    asset: 'Activos',
    meter: 'Medidores',
    tariff: 'Tarifas',
    'alert-rule': 'Alertas'
  };

  readonly catalog = this.hier.catalog;

  selectedRegion = signal('');
  selectedBranchId = signal('');
  selectedBuildingId = signal('');
  selectedCostCenterId = signal('');

  /** Regiones únicas para `<select>` nativo (evita bugs de overlay/CD con p-dropdown). */
  readonly hierRegions = computed(() => this.hier.regions());

  readonly filteredBranches = computed(() => {
    const r = this.selectedRegion().trim();
    const list = this.hier.catalog().branches;
    if (!r) return [...list];
    return list.filter((b) => (b.region ?? '').trim() === r);
  });

  readonly branchDropdownOptions = computed(() =>
    this.filteredBranches().map((b) => ({ label: `${b.name} (${b.branchId})`, value: b.branchId }))
  );

  readonly buildingDropdownOptions = computed(() => {
    const bid = this.selectedBranchId().trim();
    if (!bid) return [];
    return this.hier
      .catalog()
      .buildings.filter((b) => b.branchId === bid)
      .map((b) => ({ label: `${b.name} (${b.buildingId})`, value: b.buildingId }));
  });

  readonly costCenterDropdownOptions = computed(() => {
    const bid = this.selectedBranchId().trim();
    if (!bid) return [];
    return this.hier
      .catalog()
      .costCenters.filter((c) => c.branchId === bid || c.branchId === '')
      .map((c) => ({ label: `${c.name} (${c.id})`, value: c.id }));
  });

  readonly treeNodes = computed(() => this.buildTreeNodes());

  readonly branchesRows = computed(() => {
    const r = this.selectedRegion().trim();
    const list = this.hier.catalog().branches;
    if (!r) return [...list];
    return list.filter((b) => (b.region ?? '').trim() === r);
  });

  readonly buildingsRows = computed(() => {
    const bid = this.selectedBranchId().trim();
    const list = this.hier.catalog().buildings;
    if (!bid) return [...list];
    return list.filter((b) => b.branchId === bid);
  });

  readonly costCentersRows = computed(() => {
    const bid = this.selectedBranchId().trim();
    const list = this.hier.catalog().costCenters;
    if (!bid) return [...list];
    return list.filter((c) => c.branchId === bid || c.branchId === '');
  });

  readonly assetsRows = computed(() => this.filterAssets());
  readonly metersRows = computed(() => this.filterMeters());
  readonly tariffsRows = computed(() => {
    const bid = this.selectedBranchId().trim();
    const list = this.hier.catalog().tariffs;
    if (!bid) return [...list];
    return list.filter((t) => t.branchId === bid);
  });

  readonly alertsRows = computed(() => {
    const bid = this.selectedBranchId().trim();
    const list = this.hier.catalog().alertRules;
    if (!bid) return [...list];
    return list.filter((a) => a.branchId === bid);
  });

  activeTabIndex = 0;
  syncingCc = signal(false);
  syncingTariffs = signal(false);

  dialogVisible = signal(false);
  dialogTab = signal<HierarchyAdminTab>('branch');
  dialogTitle = '';
  dialogForm!: FormGroup;

  ngOnInit(): void {
    this.hier.loadFromStorage();
    const bid = this.ctx.branchId().trim();
    const bd = this.ctx.buildingId().trim();
    if (bid) {
      const br = this.hier.catalog().branches.find((b) => b.branchId === bid);
      const region = (br?.region ?? '').trim();
      if (region) {
        this.selectedRegion.set(region);
      }
      this.selectedBranchId.set(bid);
    }
    if (bd) {
      this.selectedBuildingId.set(bd);
    }
  }

  private buildTreeNodes(): TreeNode[] {
    const cat = this.hier.catalog();
    const byRegion = new Map<string, BranchCatalogRow[]>();
    for (const b of cat.branches) {
      const region = (b.region ?? '').trim() || 'Sin región';
      const arr = byRegion.get(region) ?? [];
      arr.push(b);
      byRegion.set(region, arr);
    }
    const regions = [...byRegion.keys()].sort((a, x) => a.localeCompare(x));
    return regions.map((region) => ({
      label: region,
      data: { kind: 'region' as const, region },
      expanded: true,
      children: (byRegion.get(region) ?? []).map((br) => ({
        label: `${br.name} (${br.branchId})`,
        data: { kind: 'branch' as const, branchId: br.branchId, region },
        expanded: true,
        children: cat.buildings
          .filter((bl) => bl.branchId === br.branchId)
          .map((bl) => ({
            label: `${bl.name} (${bl.buildingId})`,
            data: {
              kind: 'building' as const,
              branchId: bl.branchId,
              buildingId: bl.buildingId
            }
          }))
      }))
    }));
  }

  onTreeNodeSelect(event: { node?: TreeNode }): void {
    const data = event.node?.data as
      | { kind: 'region'; region: string }
      | { kind: 'branch'; branchId: string; region: string }
      | { kind: 'building'; branchId: string; buildingId: string }
      | undefined;
    if (!data) return;
    if (data.kind === 'region') {
      this.selectedRegion.set(data.region === 'Sin región' ? '' : data.region);
      this.selectedBranchId.set('');
      this.selectedBuildingId.set('');
      this.selectedCostCenterId.set('');
      return;
    }
    if (data.kind === 'branch') {
      this.selectedRegion.set((data.region ?? '').trim() === 'Sin región' ? '' : (data.region ?? '').trim());
      this.selectedBranchId.set(data.branchId);
      this.ctx.setBranchId(data.branchId);
      this.selectedBuildingId.set('');
      this.selectedCostCenterId.set('');
      return;
    }
    if (data.kind === 'building') {
      this.selectedBranchId.set(data.branchId);
      this.ctx.setBranchId(data.branchId);
      this.selectedBuildingId.set(data.buildingId);
      this.ctx.setBuildingId(data.buildingId);
      this.selectedCostCenterId.set('');
    }
  }

  onRegionDropdownChange(value: string): void {
    this.selectedRegion.set(value ?? '');
    this.pruneBranchIfNeeded();
  }

  onBranchDropdownChange(value: string): void {
    const v = (value ?? '').trim();
    this.selectedBranchId.set(v);
    if (v) {
      this.ctx.setBranchId(v);
      this.pruneBuildingIfNeeded();
      this.pruneCostCenterIfNeeded();
      return;
    }
    this.selectedBuildingId.set('');
    this.selectedCostCenterId.set('');
  }

  onBuildingDropdownChange(value: string): void {
    this.selectedBuildingId.set(value ?? '');
    if (value) {
      this.ctx.setBuildingId(value);
    }
  }

  onCostCenterDropdownChange(value: string): void {
    this.selectedCostCenterId.set(value ?? '');
  }

  private pruneBranchIfNeeded(): void {
    const fb = this.filteredBranches().map((b) => b.branchId);
    const cur = this.selectedBranchId().trim();
    if (cur && !fb.includes(cur)) {
      this.selectedBranchId.set('');
      this.selectedBuildingId.set('');
      this.selectedCostCenterId.set('');
    }
  }

  private pruneBuildingIfNeeded(): void {
    const opts = this.buildingDropdownOptions().map((o) => o.value);
    const cur = this.selectedBuildingId().trim();
    if (cur && !opts.includes(cur)) {
      this.selectedBuildingId.set('');
    }
  }

  private pruneCostCenterIfNeeded(): void {
    const opts = this.costCenterDropdownOptions().map((o) => o.value);
    const cur = this.selectedCostCenterId().trim();
    if (cur && !opts.includes(cur)) {
      this.selectedCostCenterId.set('');
    }
  }

  private filterAssets(): AssetCatalogRow[] {
    let rows = this.hier.catalog().assets;
    const b = this.selectedBranchId().trim();
    if (b) rows = rows.filter((a) => a.branchId === b);
    const g = this.selectedBuildingId().trim();
    if (g) rows = rows.filter((a) => a.buildingId === g);
    const cc = this.selectedCostCenterId().trim();
    if (cc) rows = rows.filter((a) => a.costCenterId === cc);
    return rows;
  }

  private filterMeters(): MeterCatalogRow[] {
    let rows = this.hier.catalog().meters;
    const b = this.selectedBranchId().trim();
    if (b) rows = rows.filter((m) => m.branchId === b);
    const g = this.selectedBuildingId().trim();
    if (g) rows = rows.filter((m) => m.buildingId === g);
    return rows;
  }

  openCreate(tab: HierarchyAdminTab): void {
    this.dialogTab.set(tab);
    this.dialogTitle = `Alta · ${this.tabLabels[tab]}`;
    this.dialogForm = this.buildFormForTab(tab, null);
    this.dialogVisible.set(true);
  }

  openEdit(tab: HierarchyAdminTab, row: unknown): void {
    this.dialogTab.set(tab);
    this.dialogTitle = `Editar · ${this.tabLabels[tab]}`;
    this.dialogForm = this.buildFormForTab(tab, row as Record<string, unknown>);
    this.applyReadonlyKeys(tab);
    this.dialogVisible.set(true);
  }

  private applyReadonlyKeys(tab: HierarchyAdminTab): void {
    const disable = (k: string) => this.dialogForm.get(k)?.disable({ emitEvent: false });
    if (tab === 'branch') disable('branchId');
    if (tab === 'building') {
      disable('branchId');
      disable('buildingId');
    }
    if (tab === 'cost-center') disable('id');
    if (tab === 'asset') disable('assetId');
    if (tab === 'meter') {
      disable('branchId');
      disable('meterId');
    }
    if (tab === 'tariff') {
      disable('branchId');
      disable('serviceType');
    }
    if (tab === 'alert-rule') {
      disable('branchId');
      disable('entityId');
      disable('alertType');
    }
  }

  private buildFormForTab(tab: HierarchyAdminTab, row: Record<string, unknown> | null): FormGroup {
    const key = this.toSetupKey(tab);
    const defs = SETUP_PAGE_REGISTRY[key].fields;
    const controls: Record<string, FormControl> = {};
    for (const f of defs) {
      let val: string | number | boolean | null =
        row && row[f.key] != null
          ? (f.type === 'number'
              ? Number(row[f.key])
              : f.type === 'checkbox'
                ? Boolean(row[f.key])
                : String(row[f.key]))
          : f.default !== undefined
            ? f.default
            : f.type === 'checkbox'
              ? false
              : f.type === 'number'
                ? null
                : '';
      if (tab === 'building' && f.key === 'branchId' && !row) {
        val = this.selectedBranchId().trim() || (typeof val === 'string' ? val : '');
      }
      if (tab === 'meter' && f.key === 'branchId' && !row) {
        val = this.selectedBranchId().trim() || (typeof val === 'string' ? val : '');
      }
      if (tab === 'meter' && f.key === 'buildingId' && !row) {
        val = this.selectedBuildingId().trim() || (typeof val === 'string' ? val : '');
      }
      if (tab === 'asset' && f.key === 'branchId' && !row) {
        val = this.selectedBranchId().trim() || (typeof val === 'string' ? val : '');
      }
      if (tab === 'asset' && f.key === 'buildingId' && !row) {
        val = this.selectedBuildingId().trim() || (typeof val === 'string' ? val : '');
      }
      if (tab === 'asset' && f.key === 'costCenterId' && !row) {
        val = this.selectedCostCenterId().trim() || (typeof val === 'string' ? val : '');
      }
      if (tab === 'tariff' && f.key === 'branchId' && !row) {
        val = this.selectedBranchId().trim() || (typeof val === 'string' ? val : '');
      }
      if (tab === 'alert-rule' && f.key === 'branchId' && !row) {
        val = this.selectedBranchId().trim() || (typeof val === 'string' ? val : '');
      }
      if (tab === 'cost-center' && f.key === 'branchId' && !row) {
        val = this.selectedBranchId().trim() || (typeof val === 'string' ? val : '');
      }
      controls[f.key] = new FormControl(val);
    }
    return this.fb.group(controls);
  }

  private toSetupKey(tab: HierarchyAdminTab): SetupPageKey {
    if (tab === 'cost-center') return 'cost-center';
    if (tab === 'alert-rule') return 'alert-rule';
    return tab;
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  async submitDialog(): Promise<void> {
    const tab = this.dialogTab();
    const key = this.toSetupKey(tab);
    const raw = this.dialogForm.getRawValue() as Record<string, unknown>;
    try {
      const result = await SETUP_PAGE_REGISTRY[key].submit(this.api, this.ctx, raw);
      if (result.success) {
        this.recordAfterSuccess(tab, raw);
        this.notifications.success('AppSync', result.message ?? 'Guardado correctamente');
        this.dialogVisible.set(false);
      } else {
        this.notifications.error('No se guardó', result.message ?? 'success = false');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      this.notifications.error('AppSync', msg);
    }
  }

  private recordAfterSuccess(tab: HierarchyAdminTab, v: Record<string, unknown>): void {
    const s = (k: string) => (v[k] == null ? '' : String(v[k]).trim());
    const n = (k: string) => {
      const x = Number(v[k]);
      return Number.isFinite(x) ? x : 0;
    };
    const b = (k: string) => Boolean(v[k]);
    switch (tab) {
      case 'branch':
        this.hier.upsertBranch({
          branchId: s('branchId'),
          name: s('name'),
          region: s('region'),
          m2Surface: n('m2Surface'),
          facilityType: s('facilityType'),
          timezone: s('timezone')
        });
        if (s('branchId')) {
          this.ctx.setBranchId(s('branchId'));
        }
        break;
      case 'building':
        this.hier.upsertBuilding({
          branchId: s('branchId'),
          buildingId: s('buildingId'),
          name: s('name'),
          usageType: s('usageType'),
          status: s('status'),
          yearBuilt: Math.round(n('yearBuilt')),
          m2Surface: n('m2Surface'),
          m3Volume: n('m3Volume'),
          hvacType: s('hvacType'),
          hasBms: b('hasBms')
        });
        if (s('buildingId')) {
          this.ctx.setBuildingId(s('buildingId'));
        }
        break;
      case 'cost-center':
        this.hier.upsertCostCenter({
          id: s('id'),
          name: s('name'),
          branchId: s('branchId'),
          method: s('method'),
          percentage: n('percentage'),
          annualBudget: n('annualBudget')
        });
        break;
      case 'asset':
        this.hier.upsertAsset({
          assetId: s('assetId'),
          name: s('name'),
          category: s('category'),
          status: s('status'),
          nominalPower: n('nominalPower'),
          meterId: s('meterId'),
          branchId: s('branchId'),
          buildingId: s('buildingId'),
          costCenterId: s('costCenterId')
        });
        break;
      case 'meter':
        this.hier.upsertMeter({
          branchId: s('branchId'),
          meterId: s('meterId'),
          name: s('name'),
          serialNumber: s('serialNumber'),
          iotName: s('iotName'),
          protocol: s('protocol'),
          type: s('type'),
          isMain: b('isMain'),
          buildingId: s('buildingId')
        });
        break;
      case 'tariff':
        this.hier.upsertTariff({
          branchId: s('branchId'),
          serviceType: s('serviceType'),
          providerName: s('providerName'),
          contractId: s('contractId'),
          pricingModel: s('pricingModel'),
          baseRate: n('baseRate'),
          validFrom: s('validFrom'),
          validTo: s('validTo')
        });
        break;
      case 'alert-rule':
        this.hier.upsertAlertRule({
          branchId: s('branchId'),
          entityId: s('entityId'),
          alertType: s('alertType'),
          name: s('name'),
          status: s('status'),
          priority: s('priority'),
          threshold: n('threshold'),
          operator: s('operator')
        });
        break;
      default:
        break;
    }
  }

  confirmDelete(tab: HierarchyAdminTab, row: unknown): void {
    this.confirm.confirm({
      message:
        'Se eliminará solo del catálogo en este navegador. La API AppSync aún no expone mutaciones delete para estas entidades.',
      header: 'Quitar del catálogo local',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteLocal(tab, row)
    });
  }

  private deleteLocal(tab: HierarchyAdminTab, row: unknown): void {
    switch (tab) {
      case 'branch':
        this.hier.removeBranch((row as BranchCatalogRow).branchId);
        break;
      case 'building':
        this.hier.removeBuilding((row as BuildingCatalogRow).branchId, (row as BuildingCatalogRow).buildingId);
        break;
      case 'cost-center':
        this.hier.removeCostCenter((row as CostCenterCatalogRow).id);
        break;
      case 'asset':
        this.hier.removeAsset((row as AssetCatalogRow).assetId);
        break;
      case 'meter':
        this.hier.removeMeter((row as MeterCatalogRow).branchId, (row as MeterCatalogRow).meterId);
        break;
      case 'tariff':
        this.hier.removeTariff((row as TariffCatalogRow).branchId, (row as TariffCatalogRow).serviceType);
        break;
      case 'alert-rule': {
        const r = row as AlertRuleCatalogRow;
        this.hier.removeAlertRule(r.branchId, r.entityId, r.alertType);
        break;
      }
      default:
        break;
    }
    this.notifications.success('Catálogo local', 'Registro eliminado en este dispositivo');
  }

  async pullCostCenters(): Promise<void> {
    this.syncingCc.set(true);
    try {
      const rows = await this.appSync.getCostCenters();
      const n = this.hier.mergeCostCentersFromApi(rows);
      this.notifications.success('Sincronización', `Fusionados ${n} registros desde getCostCenters`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      this.notifications.error('getCostCenters', msg);
    } finally {
      this.syncingCc.set(false);
    }
  }

  async pullTariffs(): Promise<void> {
    const bid = this.selectedBranchId().trim();
    if (!bid) {
      this.notifications.error('Tarifas', 'Selecciona una sucursal en los filtros superiores.');
      return;
    }
    this.syncingTariffs.set(true);
    try {
      const rows = await this.appSync.getTariffsByBranch(bid);
      const n = this.hier.mergeTariffsFromApi(bid, rows);
      this.notifications.success('Sincronización', `Fusionadas ${n} tarifas para ${bid}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      this.notifications.error('getTariffsByBranch', msg);
    } finally {
      this.syncingTariffs.set(false);
    }
  }

  readonly dialogFields = computed(() => {
    const tab = this.dialogTab();
    const key = this.toSetupKey(tab);
    return SETUP_PAGE_REGISTRY[key].fields;
  });
}
