import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { generateClient } from 'aws-amplify/api';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppSyncService {
  private http = inject(HttpClient);
  private client = generateClient();

  /**
   * 1. Obtiene la URL firmada para subir el archivo a S3 (Sin cambios)
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
        variables: { name: cleanFileName, type: fileType }
      });
      return response?.data?.getPresignedUrl?.uploadURL;
    } catch (error) {
      console.error("❌ Error en getPresignedUrl:", error);
      throw error;
    }
  }

  /**
   * 2. Sube el binario a S3 (Sin cambios)
   */
  async uploadFileToS3(
    uploadUrl: string,
    file: File,
    metadata: any = {} // Agregamos el parámetro de metadata
  ): Promise<{ success: boolean, key: string }> {

    // 1. Construimos los headers base
    let headers = new HttpHeaders({ 'Content-Type': file.type });

    // 2. Mapeamos el objeto metadata a headers x-amz-meta-*
    // Importante: S3 espera strings y prefiere minúsculas
    Object.keys(metadata).forEach(key => {
      if (metadata[key]) {
        const headerKey = `x-amz-meta-${key.toLowerCase()}`;
        headers = headers.set(headerKey, String(metadata[key]));
      }
    });

    const urlPath = new URL(uploadUrl).pathname;
    const finalKey = decodeURIComponent(urlPath.startsWith('/') ? urlPath.substring(1) : urlPath);

    try {
      console.log('🚀 Subiendo a S3 con metadatos:', metadata);
      await firstValueFrom(this.http.put(uploadUrl, file, { headers }));
      return { success: true, key: finalKey };
    } catch (error) {
      console.error('❌ Error en el upload S3:', error);
      throw error;
    }
  }

  /**
   * 3. NUEVO: Registro inicial en la base de datos.
   * Esto dispara el flujo SQS -> Lambda IA en el backend.
   * Reemplaza la necesidad de llamar a processInvoiceIA desde el front.
   */
  async createInvoice(input: any): Promise<any> {
    const mutation = `
      mutation CreateInvoice($input: CreateInvoiceInput!) {
        createInvoice(input: $input) {
          id
          status
          storageKey
        }
      }
    `;
    try {
      const response: any = await this.client.graphql({
        query: mutation,
        variables: { input }
      });
      return response?.data?.createInvoice;
    } catch (error) {
      console.error("❌ Error en createInvoice:", error);
      throw error;
    }
  }

  /**
   * 4. NUEVO: Escucha el cambio de estado (Subscription).
   * Se activa cuando la Lambda que consume de la SQS termina y actualiza el registro.
   */
  onInvoiceUpdated(invoiceId: string): Observable<any> {
    const subscription = `
      subscription OnInvoiceUpdated($id: ID!) {
        onInvoiceUpdated(id: $id) {
          id
          status
          extractedData
        }
      }
    `;
    // Retornamos el observable de la suscripción de Amplify
    return this.client.graphql({
      query: subscription,
      variables: { id: invoiceId }
    }) as any;
  }

  /**
   * 5. Confirmación Final (Clic del Usuario)
   * Se mantiene para persistir los cambios manuales del Step 2.
   */
  async confirmInvoice(storageKey: string, input: any): Promise<any> {
    const mutation = `
      mutation ConfirmInvoice($sk: String!, $input: ConfirmInvoiceInput!) {
        confirmInvoice(sk: $sk, input: $input) {
          success
          message
          id
        }
      }
    `;
    try {
      const response: any = await this.client.graphql({
        query: mutation,
        variables: { sk: storageKey, input: input }
      });
      return response?.data?.confirmInvoice;
    } catch (error: any) {
      console.error("❌ Error en confirmInvoice:", error);
      throw error;
    }
  }
}