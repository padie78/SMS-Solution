import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

// Instanciamos el cliente fuera del handler para reutilizar conexiones (Best Practice)
const s3 = new S3Client({});

/**
 * Obtiene el ID de la organización basado en la ubicación del archivo
 * o sus metadatos en S3.
 */
export const getOrganizationId = async (bucket, key) => {
    console.log(`🔍 [s3Helper]: Identificando organización para ${key}...`);

    try {
        // 1. INTENTO POR PATH (Estructura: uploads/{orgId}/factura.pdf)
        const pathParts = key.split('/');
        
        // Asumimos que si hay carpetas, la primera después de 'uploads' es el ID
        const orgIdFromPath = pathParts.length > 1 ? pathParts[1] : null;

        if (orgIdFromPath && orgIdFromPath !== 'uploads' && orgIdFromPath !== '') {
            console.log(`✅ [s3Helper]: OrgId encontrado en Path -> ${orgIdFromPath}`);
            return orgIdFromPath;
        }

        // 2. INTENTO POR METADATA (Fallback)
        // Si el archivo está en la raíz o el path no es confiable, consultamos S3
        const head = await s3.send(new HeadObjectCommand({ 
            Bucket: bucket, 
            Key: key 
        }));

        // Buscamos 'organization-id' o 'organizationid' (S3 los pone en minúsculas)
        const orgIdFromMeta = head.Metadata?.['organization-id'] || head.Metadata?.['organizationid'];

        if (orgIdFromMeta) {
            console.log(`✅ [s3Helper]: OrgId encontrado en Metadata -> ${orgIdFromMeta}`);
            return orgIdFromMeta;
        }

        // 3. FALLBACK FINAL
        console.warn(`⚠️ [s3Helper]: No se pudo determinar OrgId. Usando UNKNOWN_ORG.`);
        return 'UNKNOWN_ORG';

    } catch (error) {
        // Si hay un error de permisos o el archivo no existe
        console.error(`❌ [s3Helper_ERROR]: Error al acceder a S3 Metadata: ${error.message}`);
        return 'UNKNOWN_ORG';
    }
};