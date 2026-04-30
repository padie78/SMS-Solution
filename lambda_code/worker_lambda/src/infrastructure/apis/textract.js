import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

const client = new TextractClient({
  region: process.env.AWS_REGION || "eu-central-1"
});

/**
 * Extracts raw text (OCR) from an S3 document using AWS Textract.
 * @param {string} bucket
 * @param {string} key
 * @returns {Promise<string>}
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

    const rawText = response.Blocks
      ? response.Blocks.filter((block) => block.BlockType === "LINE").map((block) => block.Text).join("\n")
      : "";

    if (!rawText || rawText.trim().length === 0) {
      console.warn(`[TEXTRACT_WARN] No text content found in: ${key}`);
      throw new Error("Textract returned empty content. Verify the document is not an empty image.");
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[TEXTRACT_SUCCESS] OCR completed. Length: ${rawText.length} chars. Time: ${duration}s`);
    return rawText;
  } catch (error) {
    const msg = error?.message ? String(error.message) : "Unknown error";
    console.error(`[TEXTRACT_FATAL_ERROR] Failed to process ${key}`);
    console.error(`[DETAILS]: ${msg}`);
    throw error;
  }
};

