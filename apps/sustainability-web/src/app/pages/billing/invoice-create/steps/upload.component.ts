import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

// PrimeNG
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';

@Component({
  selector: 'app-invoice-upload',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    FileUploadModule, ButtonModule, InputTextModule, 
    DropdownModule, InputTextareaModule
  ],
  templateUrl: './invoice-upload.component.html',
  styleUrls: ['./invoice-upload.component.css']
})
export class InvoiceUploadComponent implements OnInit {
  @Output() onComplete = new EventEmitter<any>();

  uploadForm: FormGroup;
  selectedFile: File | null = null;

  serviceTypes = [
    { label: 'Electricity', value: 'electricity' },
    { label: 'Water', value: 'water' },
    { label: 'Gas', value: 'gas' }
  ];

  buildings = [
    { label: 'Main Headquarters', value: 'bld-01' },
    { label: 'Manufacturing Plant', value: 'bld-02' }
  ];

  // Datos maestros de medidores vinculados a edificios
  allMeters = [
    { label: 'Main Grid - Meter A1', value: 'MTR-A1', bId: 'bld-01' },
    { label: 'Solar Array - Meter S1', value: 'MTR-S1', bId: 'bld-01' },
    { label: 'Main Gas Inlet', value: 'GAS-P1', bId: 'bld-02' }
  ];
  filteredMeters: any[] = [];

  constructor() {
    this.uploadForm = new FormGroup({
      serviceType: new FormControl('', [Validators.required]),
      building: new FormControl('', [Validators.required]),
      meterId: new FormControl('', [Validators.required]),
      costCenter: new FormControl('', [Validators.required]),
      internalNote: new FormControl('')
    });
  }

  ngOnInit() {
    // Filtrar medidores cuando cambie el edificio
    this.uploadForm.get('building')?.valueChanges.subscribe(val => {
      this.filteredMeters = this.allMeters.filter(m => m.bId === val);
      this.uploadForm.get('meterId')?.setValue('');
    });
  }

  onFileSelect(event: any) {
    this.selectedFile = event.files[0];
  }

  processAndContinue() {
    if (this.uploadForm.valid && this.selectedFile) {
      this.onComplete.emit({ ...this.uploadForm.value, file: this.selectedFile });
    }
  }
}