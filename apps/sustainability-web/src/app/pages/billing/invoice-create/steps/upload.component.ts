import { Component, Output, EventEmitter, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';

import { toInvoiceDynamoId } from '../../../../core/models/api/appsync-api.models';
import { InvoiceStateService } from '../../../../services/state/invoice-state.service';
import { AppSyncApiService } from '../../../../services/infrastructure/appsync-api.service';
import { S3StorageService } from '../../../../services/infrastructure/s3-storage.service';
import { AuthService } from '../../../../services/infrastructure/auth.service';
import { NotificationService } from '../../../../services/ui/notification.service';
import { WorkflowStateService } from '../../../../services/state/workflow-state.service';
import { FormFactoryService, type InvoiceUploadFormGroup } from '../../../../services/business/form-factory.service';

type DropdownOption = { label: string; value: string };

interface BranchOption extends DropdownOption {
  regionId: string;
}

interface BuildingOption extends DropdownOption {
  branchId: string;
}

interface MeterOption extends DropdownOption {
  buildingId: string;
}

interface CostCenterOption extends DropdownOption {
  /** Empty = available for any building (org-wide CC). */
  buildingIds: string[];
}

@Component({
  selector: 'app-invoice-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FileUploadModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    InputTextareaModule,
    ToastModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class InvoiceUploadComponent implements OnInit, OnDestroy {
  private readonly stateService = inject(InvoiceStateService);
  private readonly appsyncApi = inject(AppSyncApiService);
  private readonly s3Storage = inject(S3StorageService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly workflow = inject(WorkflowStateService);
  private readonly formFactory = inject(FormFactoryService);

  private subs = new Subscription();

  @Output() readonly onComplete = new EventEmitter<void>();

  isLoading = false;
  selectedFile: File | null = null;

  readonly regions: DropdownOption[] = [
    { label: 'LatAm', value: 'reg-latam' },
    { label: 'EMEA', value: 'reg-emea' },
    { label: 'North America', value: 'reg-nam' }
  ];

  private readonly branchesAll: BranchOption[] = [
    { label: 'Argentina — Buenos Aires Hub', value: 'bra-arg-ba', regionId: 'reg-latam' },
    { label: 'Brazil — São Paulo Ops', value: 'bra-br-sp', regionId: 'reg-latam' },
    { label: 'Mexico — CDMX', value: 'bra-mx-cdmx', regionId: 'reg-latam' },
    { label: 'Spain — Madrid Iberia', value: 'bra-es-mad', regionId: 'reg-emea' },
    { label: 'Germany — Frankfurt', value: 'bra-de-fra', regionId: 'reg-emea' },
    { label: 'United States — Texas', value: 'bra-us-tx', regionId: 'reg-nam' }
  ];

  filteredBranches: BranchOption[] = [];

  private readonly buildingsAll: BuildingOption[] = [
    { label: 'Main Headquarters', value: 'bld-01', branchId: 'bra-arg-ba' },
    { label: 'Warehouse North', value: 'bld-02', branchId: 'bra-arg-ba' },
    { label: 'Manufacturing Plant', value: 'bld-03', branchId: 'bra-br-sp' },
    { label: 'CDMX Offices', value: 'bld-04', branchId: 'bra-mx-cdmx' },
    { label: 'Madrid Campus', value: 'bld-05', branchId: 'bra-es-mad' },
    { label: 'Frankfurt DC', value: 'bld-06', branchId: 'bra-de-fra' },
    { label: 'Houston Industrial', value: 'bld-07', branchId: 'bra-us-tx' }
  ];

  filteredBuildings: BuildingOption[] = [];

  private readonly allMeters: MeterOption[] = [
    { label: 'Main Meter — Grid A1', value: 'MTR-A1', buildingId: 'bld-01' },
    { label: 'Server Room Sub-meter', value: 'MTR-SR', buildingId: 'bld-01' },
    { label: 'HVAC North Loop', value: 'MTR-HVAC-N', buildingId: 'bld-02' },
    { label: 'Production Line 1', value: 'MTR-PL1', buildingId: 'bld-03' },
    { label: 'CDMX Lighting Panel', value: 'MTR-CDMX-L', buildingId: 'bld-04' },
    { label: 'Madrid Offices — Gas', value: 'MTR-MAD-G', buildingId: 'bld-05' },
    { label: 'Frankfurt UPS Feed', value: 'MTR-FRA-UPS', buildingId: 'bld-06' },
    { label: 'Houston Compressor', value: 'MTR-HOU-C', buildingId: 'bld-07' }
  ];

  filteredMeters: MeterOption[] = [];

  private readonly allCostCenters: CostCenterOption[] = [
    {
      label: 'Corporate — HQ Operations',
      value: 'cc-hq-ops',
      buildingIds: ['bld-01', 'bld-05']
    },
    {
      label: 'Logistics — Warehousing',
      value: 'cc-log-wh',
      buildingIds: ['bld-02', 'bld-07']
    },
    {
      label: 'Manufacturing — Production',
      value: 'cc-mfg-prd',
      buildingIds: ['bld-03']
    },
    {
      label: 'Regional Admin — Shared Services',
      value: 'cc-reg-adm',
      buildingIds: []
    },
    {
      label: 'Data Center — Infrastructure',
      value: 'cc-dc-inf',
      buildingIds: ['bld-06']
    },
    {
      label: 'Mexico — Branch Overhead',
      value: 'cc-mx-oh',
      buildingIds: ['bld-04']
    }
  ];

  filteredCostCenters: CostCenterOption[] = [];

  readonly serviceTypes = [
    { label: 'Electricity', value: 'electricity' },
    { label: 'Water', value: 'water' },
    { label: 'Gas', value: 'gas' }
  ];

  uploadForm: InvoiceUploadFormGroup = this.formFactory.buildInvoiceUploadForm();

  async ngOnInit(): Promise<void> {
    await this.auth.ensureSession();

    const regionCtrl = this.uploadForm.controls.regionId;
    const branchCtrl = this.uploadForm.controls.branchId;
    const buildingCtrl = this.uploadForm.controls.building;

    this.subs.add(
      regionCtrl.valueChanges.subscribe((regionId) => {
        this.uploadForm.patchValue(
          { branchId: '', building: '', meterId: '', costCenter: '' },
          { emitEvent: false }
        );
        this.applyBranchFilter(regionId);
        this.filteredBuildings = [];
        this.filteredMeters = [];
        this.filteredCostCenters = [];
        this.syncHierarchyControls();
      })
    );

    this.subs.add(
      branchCtrl.valueChanges.subscribe((branchId) => {
        this.uploadForm.patchValue({ building: '', meterId: '', costCenter: '' }, { emitEvent: false });
        this.applyBuildingFilter(branchId);
        this.filteredMeters = [];
        this.filteredCostCenters = [];
        this.syncHierarchyControls();
      })
    );

    this.subs.add(
      buildingCtrl.valueChanges.subscribe((buildingId) => {
        this.uploadForm.patchValue({ meterId: '', costCenter: '' }, { emitEvent: false });
        this.applyMeterFilter(buildingId);
        this.applyCostCenterFilter(buildingId);
        this.syncHierarchyControls();
      })
    );

    const saved = this.stateService.getSnapshot();
    this.uploadForm.patchValue(
      {
        regionId: saved.regionId ?? '',
        branchId: saved.branchId ?? '',
        building: saved.buildingId ?? '',
        serviceType: saved.serviceType ?? '',
        meterId: saved.meterId ?? '',
        costCenter: saved.costCenterId ?? '',
        internalNote: saved.internalNote ?? ''
      },
      { emitEvent: false }
    );

    this.applyBranchFilter(saved.regionId);
    this.applyBuildingFilter(saved.branchId);
    this.applyMeterFilter(saved.buildingId);
    this.applyCostCenterFilter(saved.buildingId);
    this.syncHierarchyControls();
    this.selectedFile = saved.file;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private applyBranchFilter(regionId: string | null): void {
    this.filteredBranches = regionId ? this.branchesAll.filter((b) => b.regionId === regionId) : [];
  }

  private applyBuildingFilter(branchId: string | null): void {
    this.filteredBuildings = branchId ? this.buildingsAll.filter((b) => b.branchId === branchId) : [];
  }

  private applyMeterFilter(buildingId: string | null): void {
    this.filteredMeters = buildingId ? this.allMeters.filter((m) => m.buildingId === buildingId) : [];

    const meterCtrl = this.uploadForm.controls.meterId;
    const current = meterCtrl.value;
    if (!this.filteredMeters.some((m) => m.value === current)) {
      meterCtrl.setValue('', { emitEvent: false });
    }
  }

  private applyCostCenterFilter(buildingId: string | null): void {
    if (!buildingId) {
      this.filteredCostCenters = [];
      this.uploadForm.controls.costCenter.setValue('', { emitEvent: false });
      return;
    }

    this.filteredCostCenters = this.allCostCenters.filter(
      (cc) => cc.buildingIds.length === 0 || cc.buildingIds.includes(buildingId)
    );

    const ccCtrl = this.uploadForm.controls.costCenter;
    const current = ccCtrl.value;
    if (!this.filteredCostCenters.some((c) => c.value === current)) {
      ccCtrl.setValue('', { emitEvent: false });
    }
  }

  /** Enable/disable cascading dropdowns so validators align with UX. */
  private syncHierarchyControls(): void {
    const regionId = this.uploadForm.controls.regionId.value;
    const branchId = this.uploadForm.controls.branchId.value;
    const buildingId = this.uploadForm.controls.building.value;

    const branchCtrl = this.uploadForm.controls.branchId;
    const buildingCtrl = this.uploadForm.controls.building;
    const meterCtrl = this.uploadForm.controls.meterId;
    const costCenterCtrl = this.uploadForm.controls.costCenter;

    if (regionId) {
      branchCtrl.enable({ emitEvent: false });
    } else {
      branchCtrl.disable({ emitEvent: false });
    }

    if (branchId) {
      buildingCtrl.enable({ emitEvent: false });
    } else {
      buildingCtrl.disable({ emitEvent: false });
    }

    if (buildingId) {
      meterCtrl.enable({ emitEvent: false });
      costCenterCtrl.enable({ emitEvent: false });
    } else {
      meterCtrl.disable({ emitEvent: false });
      costCenterCtrl.disable({ emitEvent: false });
    }
  }

  onFileSelect(event: { files?: File[] }): void {
    const file = event.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.notifications.show('info', 'Archivo seleccionado', file.name);
    }
  }

  async processAndContinue(): Promise<void> {
    if (!this.uploadForm.valid || !this.selectedFile) {
      return;
    }

    this.isLoading = true;
    this.workflow.setPhase('uploading');

    try {
      const uuid = crypto.randomUUID();
      const finalId = toInvoiceDynamoId(uuid);

      const { uploadURL, key, invoiceId } = await this.appsyncApi.getPresignedUrl(
        this.selectedFile.name,
        this.selectedFile.type,
        finalId
      );

      const uploadResult = await this.s3Storage.putObject(uploadURL, this.selectedFile);

      if (!uploadResult.success) {
        throw new Error('La subida a S3 falló.');
      }

      this.stateService.setInvoiceId(invoiceId);
      this.stateService.setStorageKey(key);
      this.stateService.setStep1Data(this.formFactory.snapshotFromUploadForm(this.uploadForm), this.selectedFile);

      this.workflow.setPhase('awaiting_ai');

      this.notifications.success('Subida exitosa', 'Continuando al paso de validación…');

      this.onComplete.emit();
    } catch (error: unknown) {
      this.workflow.setPhase('error');
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.notifications.error('Error de proceso', message);
    } finally {
      this.isLoading = false;
    }
  }
}
