const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event) => {
    try {
        const userId = event.identity?.claims?.sub || "public";
        const { fileName, fileType, invoiceId } = event.arguments;

        if (!invoiceId) throw new Error("Falta el invoiceId del frontend");

        // Limpiamos el nombre original
        const cleanFileName = fileName.replace(/\s+/g, '_').toLowerCase();

        // ESTRATEGIA: El nombre del objeto en S3 contendrá el ID
        // Formato: uploads/USER_ID/INV#UUID__nombre_archivo.pdf
        const key = `uploads/${userId}/${invoiceId}__${cleanFileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.UPLOAD_BUCKET,
            Key: key,
            ContentType: fileType || 'application/pdf'
            // Quitamos el bloque Metadata para evitar errores de firma (403)
        });

        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return {
            uploadURL,
            key,
            userId,
            invoiceId,
            message: "URL generada con ID en el nombre del objeto."
        };

    } catch (error) {
        console.error("❌ Error en Signer:", error.message);
        throw new Error(error.message);
    }
};