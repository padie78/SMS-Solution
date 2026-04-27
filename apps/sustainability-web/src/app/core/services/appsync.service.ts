import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { generateClient } from 'aws-amplify/api';
import { firstValueFrom, Observable } from 'rxjs';

export interface PresignedResponse {
  uploadURL: string;
  key: string;
  invoiceId: string; // Este es el que usamos como invoiceId
}

@Injectable({
  providedIn: 'root'
})
export class AppSyncService {
  private http = inject(HttpClient);
  private client = generateClient();



  /**
   * 1. Obtiene la URL firmada para subir el archivo a S3 (Sin cambios)
   */
  async getPresignedUrl(fileName: string, fileType: string, invoiceId: string): Promise<PresignedResponse> {
    const cleanFileName = fileName.split('\\').pop()?.split('/').pop() || fileName;

    // Actualizamos la mutación para que acepte el ID como parámetro
    const mutation = `
    mutation GetUrl($name: String!, $type: String!, $id: String!) {
      getPresignedUrl(fileName: $name, fileType: $type, invoiceId: $id) {
        uploadURL
        key
        invoiceId
      }
    }
  `;

    try {
      const response: any = await this.client.graphql({
        query: mutation,
        variables: {
          name: cleanFileName,
          type: fileType,
          id: invoiceId // Enviamos el "INV#faca19f-..."
        }
      });

      const data = response?.data?.getPresignedUrl;

      if (!data) throw new Error("No se recibió respuesta de AppSync");

      console.log("🔗 URL y ID obtenidos:", data.invoiceId);
      return data;
    } catch (error) {
      console.error("❌ Error en getPresignedUrl:", error);
      throw error;
    }
  }

  /**
   * 2. Sube el binario a S3 (Sin cambios)
   */
  async uploadFileToS3(uploadUrl: string, file: File): Promise<{ success: boolean, key: string }> {
    const headers = new HttpHeaders({ 'Content-Type': file.type });
    const urlPath = new URL(uploadUrl).pathname;
    const finalKey = decodeURIComponent(urlPath.startsWith('/') ? urlPath.substring(1) : urlPath);

    try {
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
  // Cambiamos el primer argumento para que acepte el posible null y lo manejamos dentro
  async confirmInvoice(invoiceId: string | null, input: any): Promise<any> {

    // 1. Validación de seguridad: Si no hay ID, no tiene sentido llamar a AWS
    if (!invoiceId) {
      console.error("❌ [AppSyncService] No se puede confirmar: invoiceId es null o vacío.");
      return { success: false, message: "ID de factura no válido." };
    }

    const mutation = `
    mutation ConfirmInvoice($id: ID!, $input: ConfirmInvoiceInput!) {
      confirmInvoice(id: $id, input: $input) {
        success
        message
        id
      }
    }
  `;

    try {
      const response: any = await this.client.graphql({
        query: mutation,
        variables: {
          id: invoiceId, // Aquí TS ya sabe que invoiceId es string por el check de arriba
          input: input
        }
      });
      return response?.data?.confirmInvoice;
    } catch (error: any) {
      console.error("❌ [AppSyncService] Error en confirmInvoice:", error);
      throw error;
    }
  }
}