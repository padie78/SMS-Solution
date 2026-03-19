const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
    try {
        // Parseamos el body que viene del API Gateway (vía Angular)
        const { fileName, fileType, clientId } = JSON.parse(event.body);

        // Definimos dónde va a caer el archivo
        const key = `${clientId}/uploads/${Date.now()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.UPLOAD_BUCKET,
            Key: key,
            ContentType: fileType
        });

        // La URL expira en 300 segundos (5 minutos)
        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Importante para que Angular no bloquee
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uploadURL,
                key
            })
        };
    } catch (error) {
        console.error("Error generando Presigned URL:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error interno al generar el permiso de subida" })
        };
    }
};