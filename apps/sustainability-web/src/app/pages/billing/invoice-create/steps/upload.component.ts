import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

// PrimeNG Modules
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';

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
  @Output() onComplete = new EventEmitter<any>();

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

  // Esta es la lista que se mostrará en el dropdown de la UI
  filteredMeters: any[] = [];

  // Inicialización del Formulario
  uploadForm = new FormGroup({
    serviceType: new FormControl('', [Validators.required]),
    building: new FormControl('', [Validators.required]),
    meterId: new FormControl('', [Validators.required]),
    costCenter: new FormControl('', [Validators.required]),
    internalNote: new FormControl('')
  });

  selectedFile: File | null = null;

  ngOnInit() {
    // Escuchar cambios en el campo Building para filtrar los medidores disponibles
    this.uploadForm.get('building')?.valueChanges.subscribe(selectedBuildingId => {
      this.filterMeters(selectedBuildingId);
    });
  }

  // Lógica de filtrado
  private filterMeters(buildingId: string | null) {
    if (buildingId) {
      this.filteredMeters = this.allMeters.filter(m => m.buildingId === buildingId);
    } else {
      this.filteredMeters = [];
    }
    
    // Resetear el valor del medidor seleccionado para evitar datos inconsistentes
    this.uploadForm.get('meterId')?.setValue('');
  }

  onFileSelect(event: any) {
    if (event.files && event.files.length > 0) {
      this.selectedFile = event.files[0];
    }
  }

  processAndContinue() {
    if (this.uploadForm.valid && this.selectedFile) {
      const payload = {
        ...this.uploadForm.value,
        file: this.selectedFile
      };
      
      console.log('Enviando a procesamiento IA:', payload);
      this.onComplete.emit(payload);
    }
  }
}