const { generatePresignedUploadUrl } = require("./s3Service");
const { formatObjectKey } = require("./utils");

exports.handler = async (event) => {
    const requestId = event.requestContext?.requestId || "internal";
    
    try {
        console.log(`[INFRA] [${requestId}] Starting presigned URL generation flow.`);

        // Identity & Args extraction
        const userId = event.identity?.claims?.sub || "public";
        const { fileName, fileType, invoiceId } = event.arguments || {};

        // Validation
        if (!invoiceId) {
            console.error(`[VALIDATION_ERROR] [${requestId}] Missing invoiceId for userId: ${userId}`);
            throw new Error("Missing required invoiceId parameter.");
        }

        if (!process.env.UPLOAD_BUCKET) {
            console.error(`[CONFIG_ERROR] [${requestId}] UPLOAD_BUCKET environment variable is not defined.`);
            throw new Error("Internal server configuration error.");
        }

        // 1. Logic: Format the S3 Key
        const key = formatObjectKey(userId, invoiceId, fileName);
        console.log(`[LOGIC] [${requestId}] Generated S3 Key: ${key}`);

        // 2. Logic: Get the Presigned URL
        const uploadURL = await generatePresignedUploadUrl(
            process.env.UPLOAD_BUCKET, 
            key, 
            fileType || 'application/pdf'
        );

        console.log(`[SUCCESS] [${requestId}] Presigned URL generated successfully for invoiceId: ${invoiceId}`);

        return {
            uploadURL,
            key,
            userId,
            invoiceId,
            message: "Presigned URL generated successfully."
        };

    } catch (error) {
        console.error(`[FATAL_ERROR] [${requestId}] Exception: ${error.message}`);
        throw new Error(error.message.includes("Missing") ? error.message : "Internal Signer Error");
    }
};