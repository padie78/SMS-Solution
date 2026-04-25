import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

// PrimeNG Modules
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';

// State Management
import { InvoiceStateService } from '../../../core/services/invoice-state.service';

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
    InputTextareaModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class InvoiceUploadComponent implements OnInit {
  // Inyección del servicio de estado
  private stateService = inject(InvoiceStateService);

  @Output() onComplete = new EventEmitter<void>();

  // 1. Opciones maestras para los selectores
  serviceTypes = [
    { label: 'Electricity', value: 'electricity' },
    { label: 'Water', value: 'water' },
    { label: 'Gas', value: 'gas' }
  ];

  buildings = [
    { label: 'Main Headquarters', value: 'bld-01' },
    { label: 'Warehouse North', value: 'bld-02' },
    { label: 'Manufacturing Plant', value: 'bld-03' }
  ];

  costCenters = [
    { label: 'Operations', value: 'cc-ops' },
    { label: 'Administration', value: 'cc-adm' },
    { label: 'Logistics', value: 'cc-log' }
  ];

  // 2. Lista completa de Medidores vinculados a sus edificios (BuildingId)
  private allMeters = [
    { label: 'Main Meter - A1', value: 'MTR-A1', buildingId: 'bld-01' },
    { label: 'Server Room Meter', value: 'MTR-SR', buildingId: 'bld-01' },
    { label: 'HVAC System North', value: 'MTR-HVAC-N', buildingId: 'bld-02' },
    { label: 'Production Line 1', value: 'MTR-PL1', buildingId: 'bld-03' },
    { label: 'Production Line 2', value: 'MTR-PL2', buildingId: 'bld-03' }
  ];

  // Lista filtrada para el dropdown de la UI
  filteredMeters: any[] = [];

  // Inicialización del Formulario con todos los campos necesarios
  uploadForm = new FormGroup({
    serviceType: new FormControl('', [Validators.required]),
    building: new FormControl('', [Validators.required]),
    meterId: new FormControl('', [Validators.required]),
    costCenter: new FormControl('', [Validators.required]),
    internalNote: new FormControl('')
  });

  selectedFile: File | null = null;

  ngOnInit() {
    // Escuchar cambios en el campo Building para filtrar los medidores
    this.uploadForm.get('building')?.valueChanges.subscribe(selectedBuildingId => {
      this.filterMeters(selectedBuildingId);
    });

    // Opcional: Si regresas del paso 2, podrías recuperar datos previos aquí
    const savedState = this.stateService.getSnapshot();
    if (savedState) {
      this.uploadForm.patchValue(savedState);
      this.selectedFile = savedState.file;
    }
  }

  private filterMeters(buildingId: string | null) {
    if (buildingId) {
      this.filteredMeters = this.allMeters.filter(m => m.buildingId === buildingId);
    } else {
      this.filteredMeters = [];
    }
    // Resetear el valor del medidor si cambia el edificio
    this.uploadForm.get('meterId')?.setValue('');
  }

  onFileSelect(event: any) {
    if (event.files && event.files.length > 0) {
      this.selectedFile = event.files[0];
    }
  }

  /**
   * Procesa los datos, los guarda en el State Service y avanza el Stepper.
   */
  processAndContinue() {
    if (this.uploadForm.valid && this.selectedFile) {
      // Guardamos en el State Manager antes de emitir
      this.stateService.setStep1Data(this.uploadForm.value, this.selectedFile);
      
      console.log('Datos guardados en el Service. Iniciando pipeline de IA...');
      
      // Emitimos al padre para que dispare el loader de IA y cambie de paso
      this.onComplete.emit();
    }
  }
}