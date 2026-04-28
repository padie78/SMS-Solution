// s3Service.js corregido
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

async function generatePresignedUploadUrl(bucket, key, contentType) {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 300 });
}

module.exports = { generatePresignedUploadUrl };