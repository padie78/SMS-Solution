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
   * 1. Obtiene la URL firmada desde AppSync para subir el archivo a S3.
   * El backend suele generar la Key con un timestamp aquí.
   */
  async getPresignedUrl(fileName: string, fileType: string): Promise<string> {
    // Limpieza básica del nombre del archivo
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

      const url = response?.data?.getPresignedUrl?.uploadURL;
      if (!url) throw new Error("No se pudo generar la URL de subida.");

      return url;
    } catch (error) {
      console.error("❌ Error en mutation GetUrl:", error);
      throw error;
    }
  }

  /**
   * 2. Sube el binario a S3 y extrae la KEY REAL del archivo.
   * Crucial: Esta KEY es la que incluye el timestamp y la que S3 reconoce.
   */
  async uploadFileToS3(uploadUrl: string, file: File): Promise<{ success: boolean, key: string }> {
    const headers = new HttpHeaders({ 'Content-Type': file.type });

    // 1. Obtenemos el pathname completo de la URL
    // Ejemplo: /uploads/f3d4-8a2.../1777132-factura.pdf
    const urlPath = new URL(uploadUrl).pathname;

    // 2. Quitamos SOLO el primer slash y decodificamos
    // Resultado esperado: "uploads/f3d4f8a2-90c1-708c-a446-2c8592524d62/1777132240285-factura.pdf"
    const finalKey = decodeURIComponent(urlPath.startsWith('/') ? urlPath.substring(1) : urlPath);

    console.log('🚀 KEY REAL PARA LA LAMBDA:', finalKey);

    try {
      await firstValueFrom(this.http.put(uploadUrl, file, { headers }));
      return { success: true, key: finalKey };
    } catch (error) {
      console.error('❌ Error en el upload:', error);
      throw error;
    }
  }

/**
 * 3. Dispara el procesamiento de IA usando la KEY REAL.
 * @param s3Key Debe ser la key obtenida en el paso 2 (con timestamp).
 * @param folderId ID de la organización/carpeta.
 */
async processInvoiceIA(s3Key: string, folderId: string, retries = 2): Promise<any> {
  // 1. Sanitizar la Key: S3 no reconoce el slash inicial en las Keys
  const cleanKey = s3Key.startsWith('/') ? s3Key.substring(1) : s3Key;

  const mutation = `
    mutation ProcessInvoice($file: String!, $folder: String!) {
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

  for (let i = 0; i <= retries; i++) {
    try {
      console.log(`🤖 [Intento ${i + 1}] Analizando: "${cleanKey}"`);

      const response: any = await this.client.graphql({
        query: mutation,
        variables: {
          file: cleanKey, 
          folder: folderId
        }
      });

      const result = response?.data?.processInvoice;

      if (!result) throw new Error("La respuesta de AppSync llegó vacía (null).");

      // Si la Lambda reporta falla, lanzamos error para que el 'catch' decida si reintentar
      if (result.success === false) {
        throw new Error(result.message || "Error en el procesamiento de IA.");
      }

      return result; // Éxito

    } catch (error: any) {
      const isLastRetry = i === retries;
      const msg = error.message || "";

      // 2. Lógica de reintento mejorada
      // Reintentamos si el error menciona que el archivo no está, el esquema está vacío,
      // o si es un error de red/AppSync temporal.
      const shouldRetry = 
        msg.includes("vacío") || 
        msg.includes("encontrado") || 
        msg.includes("Key") ||
        msg.includes("Network Error");

      if (shouldRetry && !isLastRetry) {
        const delay = 2000 * (i + 1); 
        console.warn(`⏳ Archivo no disponible aún. Reintento ${i + 1} en ${delay/1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        continue; 
      }

      // Si no es un error "reintentable" o es el último intento, morimos aquí
      console.error("❌ Error final en ProcessInvoice:", error);
      throw error;
    }
  }
}
}