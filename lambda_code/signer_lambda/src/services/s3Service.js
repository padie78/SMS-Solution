// s3Service.js corregido
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from  "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

export const generatePresignedUploadUrl = async (bucket, key, contentType) => {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 300 });
}