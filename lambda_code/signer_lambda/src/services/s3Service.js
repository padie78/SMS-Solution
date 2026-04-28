const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ 
    region: process.env.AWS_REGION || "eu-central-1" 
});

/**
 * Generates a presigned URL for uploading a file to S3.
 */
async function generatePresignedUploadUrl(bucket, key, contentType) {
    try {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType
        });

        // 300 seconds = 5 minutes expiration
        return await getSignedUrl(s3Client, command, { expiresIn: 300 });
    } catch (error) {
        console.error(`[AWS_S3_ERROR] Failed to sign URL for key: ${key}. Error: ${error.message}`);
        throw error;
    }
}

module.exports = { generatePresignedUploadUrl };