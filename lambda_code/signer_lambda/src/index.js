const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto"); // Importamos para generar IDs reales

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event) => {
    try {
        const userId = event.identity?.claims?.sub;
        if (!userId) throw new Error("Unauthorized");

        const { fileName, fileType } = event.arguments;
        
        // --- LA MEJORA ARQUITECTÓNICA ---
        // Generamos un ID único para ESTA factura específica
        const invoiceId = randomUUID(); 
        
        const cleanFileName = fileName.replace(/\s+/g, '_').toLowerCase();
        // Usamos el invoiceId en la ruta de S3 para mantener todo vinculado
        const key = `uploads/${userId}/${invoiceId}-${cleanFileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.UPLOAD_BUCKET,
            Key: key,
            ContentType: fileType || 'application/pdf',
            Metadata: {
                "invoice-id": invoiceId, // Guardamos el ID en metadata de S3
                "owner-id": userId
            }
        });

        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return {
            uploadURL,
            key,
            userId,
            invoiceId, // <--- Ahora sí es un ID de factura real y único
            message: "URL generada exitosamente."
        };

    } catch (error) {
        console.error("Error:", error.message);
        throw new Error(error.message);
    }
};