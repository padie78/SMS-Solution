const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event) => {
    console.log("Evento recibido desde AppSync:", JSON.stringify(event, null, 2));

    try {
        // 1. Extraer Identidad (En AppSync viene en event.identity)
        // Usamos el 'sub' (ID único) del usuario logueado en Cognito
        const userId = event.identity?.claims?.sub;

        if (!userId) {
            throw new Error("Unauthorized: No identity context found");
        }

        // 2. Extraer Argumentos (En AppSync NO hay body, hay arguments)
        const { fileName, fileType } = event.arguments;

        if (!fileName) {
            throw new Error("fileName is required");
        }

        // 3. Generación de Key Estratégica
        const cleanFileName = fileName.replace(/\s+/g, '_').toLowerCase();
        const timestamp = Date.now();
        const key = `uploads/${userId}/${timestamp}-${cleanFileName}`;

        console.log(`Generando URL para usuario ${userId}: ${key}`);

        // 4. Preparar el comando de S3
        const command = new PutObjectCommand({
            Bucket: process.env.UPLOAD_BUCKET,
            Key: key,
            ContentType: fileType || 'application/pdf'
        });

        // 5. Generar la Presigned URL (Válida por 5 minutos)
        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // 6. Respuesta limpia para GraphQL
        // AppSync no necesita statusCode ni headers, solo el objeto que pide el schema
        return {
            uploadURL,
            key,
            userId,
            message: "URL generada exitosamente."
        };

    } catch (error) {
        console.error("Error en Signer:", error.message);
        // AppSync capturará este error y lo mostrará en el array de "errors" de GraphQL
        throw new Error(error.message);
    }
};