const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Reutilización del cliente para optimizar Warm Starts
const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event) => {
    // 1. Validación defensiva del Authorizer (Compatible con REST y HTTP API)
    const claims = event.requestContext?.authorizer?.claims || 
                   event.requestContext?.authorizer?.jwt?.claims;

    if (!claims) {
        console.error("No se encontró el contexto de auth. Evento recibido:", JSON.stringify(event));
        return { 
            statusCode: 401, 
            body: JSON.stringify({ message: "Unauthorized: No identity context found" }) 
        };
    }

    // 2. Validación defensiva del Body
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing request body" })
        };
    }

    try {
        const userId = claims.sub || claims['cognito:username'];
        const { fileName, fileType } = JSON.parse(event.body);

        if (!fileName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "fileName is required" })
            };
        }

        // 3. Sanitización y Generación de Key Dinámica por Usuario
        const cleanFileName = fileName.replace(/\s+/g, '_').toLowerCase();
        const key = `${userId}/uploads/${Date.now()}-${cleanFileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.UPLOAD_BUCKET,
            Key: key,
            ContentType: fileType || 'application/pdf'
        });

        // 4. Generación de Presigned URL (Vence en 5 min)
        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uploadURL,
                key,
                userId
            })
        };
    } catch (error) {
        console.error("Error en Signer Lambda:", error);
        
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ 
                message: "Internal server error",
                requestId: event.requestContext?.requestId 
            })
        };
    }
};