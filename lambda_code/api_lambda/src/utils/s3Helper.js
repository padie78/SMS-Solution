import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

// Reutilización de conexión (AWS Best Practice)
const s3 = new S3Client({});

/**
 * Resuelve el ID de la organización para procesos asíncronos (S3 Triggers).
 * Crucial para saber bajo qué PK guardar los resultados de la IA.
 */
export const getOrganizationId = async (bucket, key) => {
    console.log(`🔍 [s3Helper]: Identificando organización para s3://${bucket}/${key}`);

    try {
        /**
         * ESTRATEGIA 1: Convención de Prefijos (Path)
         * Estructura esperada: "uploads/{orgId}/factura.pdf" o "{orgId}/invoices/file.pdf"
         */
        const pathParts = key.split('/');
        
        // Si el archivo está en 'uploads/ORG123/archivo.pdf', el ID es pathParts[1]
        // Si el archivo está en 'ORG123/archivo.pdf', el ID es pathParts[0]
        let orgIdFromPath = null;
        if (pathParts[0] === 'uploads') {
            orgIdFromPath = pathParts[1];
        } else if (pathParts.length > 1) {
            orgIdFromPath = pathParts[0];
        }

        if (orgIdFromPath && orgIdFromPath.length > 5) { // Validación mínima de UUID/ID
            console.log(`✅ [s3Helper]: OrgId identificado vía Path -> ${orgIdFromPath}`);
            return orgIdFromPath;
        }

        /**
         * ESTRATEGIA 2: Metadatos del Objeto (Fallback)
         * Útil si el frontend sube archivos vía Presigned URLs inyectando el ID en los headers.
         */
        const head = await s3.send(new HeadObjectCommand({ 
            Bucket: bucket, 
            Key: key 
        }));

        const orgIdFromMeta = head.Metadata?.['organization-id'] || head.Metadata?.['organizationid'];

        if (orgIdFromMeta) {
            console.log(`✅ [s3Helper]: OrgId identificado vía Metadata -> ${orgIdFromMeta}`);
            return orgIdFromMeta;
        }

        return 'UNKNOWN_ORG';

    } catch (error) {
        console.error(`❌ [s3Helper_ERROR]: Fallo al recuperar metadatos: ${error.message}`);
        return 'UNKNOWN_ORG';
    }
};