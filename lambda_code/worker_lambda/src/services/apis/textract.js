import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

// Client instantiation with region awareness
const client = new TextractClient({ 
    region: process.env.AWS_REGION || "eu-central-1" 
});

/**
 * Extracts raw text (OCR) from an S3 document using AWS Textract.
 * Optimized for downstream LLM processing (Bedrock).
 * * @param {string} bucket - S3 Bucket name.
 * @param {string} key - S3 Object key.
 * @returns {Promise<string>} The extracted text content.
 */
export const getTextFromS3 = async (bucket, key) => {
    const startTime = Date.now();
    console.log(`[TEXTRACT_START] Initiating OCR for: s3://${bucket}/${key}`);

    const params = {
        Document: {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        }
    };

    try {
        const command = new DetectDocumentTextCommand(params);
        const response = await client.send(command);

        /**
         * We filter only "LINE" blocks to maintain the document's 
         * natural reading flow, which helps the LLM understand context.
         */
        const rawText = response.Blocks
            ? response.Blocks
                .filter(block => block.BlockType === "LINE")
                .map(block => block.Text)
                .join("\n")
            : "";

        if (!rawText || rawText.trim().length === 0) {
            console.warn(`[TEXTRACT_WARN] No text content found in: ${key}`);
            throw new Error("Textract returned empty content. Verify the document is not an empty image.");
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[TEXTRACT_SUCCESS] OCR completed. Length: ${rawText.length} chars. Time: ${duration}s`);
        
        return rawText;

    } catch (error) {
        /**
         * Differentiates between S3 access issues and Textract processing errors.
         */
        console.error(`[TEXTRACT_FATAL_ERROR] Failed to process ${key}`);
        console.error(`[DETAILS]: ${error.message}`);
        throw error;
    }
};