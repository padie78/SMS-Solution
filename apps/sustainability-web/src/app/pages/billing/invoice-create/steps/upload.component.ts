import { Component, Output, EventEmitter } from '@angular/core'; // <-- DEBE SER @angular/core
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-invoice-upload',
  standalone: true,
  imports: [CommonModule, FileUploadModule, ButtonModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class InvoiceUploadComponent {
  @Output() onComplete = new EventEmitter<any>();

  onUpload(event: any) {
    // Aquí simularías la llamada al backend que hace el OCR
    console.log('Archivo recibido, iniciando procesamiento IA...');
    
    // Simulamos un delay de procesamiento
    setTimeout(() => {
      this.onComplete.emit(event.files[0]);
    }, 1500);
  }
}