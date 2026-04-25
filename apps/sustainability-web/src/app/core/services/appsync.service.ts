import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { generateClient } from 'aws-amplify/api';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppSyncService {
  private http = inject(HttpClient);
  private client = generateClient();

  /**
   * 1. Obtiene la URL firmada desde AppSync.
   */
  async getPresignedUrl(fileName: string, fileType: string): Promise<string> {
    const cleanFileName = fileName.split('\\').pop()?.split('/').pop() || fileName;

    const mutation = `
      mutation GetUrl($name: String!, $type: String!) {
        getPresignedUrl(fileName: $name, fileType: $type) {
          uploadURL
        }
      }
    `;

    try {
      const response: any = await this.client.graphql({
        query: mutation,
        variables: { 
          name: cleanFileName, 
          type: fileType 
        }
      });
      return response.data.getPresignedUrl.uploadURL;
    } catch (error) {
      console.error("❌ Error en mutation GetUrl:", error);
      throw error;
    }
  }

  /**
   * 2. Sube el binario directamente a S3.
   */
  async uploadFileToS3(uploadUrl: string, file: File): Promise<any> {
    // Importante: El Content-Type debe coincidir con el usado para generar la URL
    const headers = new HttpHeaders({ 'Content-Type': file.type });
    
    return await firstValueFrom(
      this.http.put(uploadUrl, file, { headers, reportProgress: true })
    );
  }

  /**
   * 3. Dispara el procesamiento de IA (Bedrock/Climatiq).
   * AJUSTADO: Coincide con el tipo InvoiceIAProcessingResponse del Schema
   */
  async processInvoiceIA(fileName: string, folderId: string): Promise<any> {
    const mutation = `
      mutation ProcessInvoice($file: String!, $folder: String) {
        processInvoice(fileName: $file, folderId: $folder) {
          success
          message
          vendor
          date
          total
          consumption
          co2e
          category
          confidence
        }
      }
    `;

    try {
      const response: any = await this.client.graphql({
        query: mutation,
        variables: { 
          file: fileName, 
          folder: folderId 
        }
      });

      // Si success es false, lanzamos error para que el componente lo capture
      const result = response.data.processInvoice;
      if (!result.success) {
        throw new Error(result.message || 'Error desconocido en el procesamiento de IA');
      }

      return result;
    } catch (error) {
      console.error("❌ Error en mutation ProcessInvoice:", error);
      throw error;
    }
  }
}