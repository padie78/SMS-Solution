import { getTextFromS3 } from "../../infrastructure/apis/textract.js";
import { identifyCategory } from "../../infrastructure/ai/classifier.js";
import { analyzeInvoice } from "../../infrastructure/ai/bedrock.js";
import { buildGoldenRecord } from "../../utils/mapper.js";
import { persistTransaction } from "../../infrastructure/dynamodb/db.js";
import { notifyInvoiceUpdate } from "../../infrastructure/notifications/appsyncService.js";

export const invoicePipeline = async (params) => {
  const { bucket, key, sk, orgId } = params;
  const startTime = Date.now();

  console.log(`[PIPELINE_START] [${sk}] Mode: Extraction Only (No Footprint)`);

  try {
    const rawText = await getTextFromS3(bucket, key);
    if (!rawText) throw new Error("Textract returned empty content");

    const detectedCategory = await identifyCategory(rawText);

    console.log(`[PIPELINE_STEP] [${sk}] Extracting invoice data via Bedrock...`);
    const aiAnalysis = await analyzeInvoice(rawText, detectedCategory);

    const emissionCalculations = { total_kg: 0, items: [] };

    const goldenRecord = buildGoldenRecord(
      orgId.startsWith("ORG#") ? orgId : `ORG#${orgId}`,
      sk,
      aiAnalysis,
      emissionCalculations,
      "READY_FOR_REVIEW",
      detectedCategory,
      { s3_key: key, bucket: bucket }
    );

    await persistTransaction(goldenRecord);

    try {
      console.log(`[PIPELINE_STEP] [${sk}] Notifying Frontend...`);

      const src = aiAnalysis?.source_data || {};
      const tech = aiAnalysis?.technical_ids || {};

      // Align with DynamoDB `extracted_data` shape for the UI.
      const uiPayload = {
        vendor: src?.vendor?.name || "Unknown",
        invoice_date: src?.invoice_date || src?.date || null,
        invoice_number: src?.invoice_number || null,
        billing_period: src?.billing_period || {},
        currency: src?.currency || "EUR",
        total_amount: src?.total_amount?.total_with_tax ?? src?.total_amount ?? 0,
        net_amount: src?.total_amount?.net_amount ?? src?.net_amount ?? null,
        tax_amount: src?.total_amount?.tax_amount ?? src?.tax_amount ?? null,
        tariff: tech?.tariff || null,
        cups: tech?.cups || null,
        contract_reference: tech?.contract_reference || null,
        contracted_power: {
          p1: tech?.contracted_power_p1 ?? null,
          p2: tech?.contracted_power_p2 ?? null
        },
        customer: src?.customer || null,
        lines: aiAnalysis.emission_lines || []
      };

      await notifyInvoiceUpdate(sk, "READY_FOR_REVIEW", "Digitization complete", uiPayload);
    } catch (notifyErr) {
      const msg = notifyErr?.message ? String(notifyErr.message) : "Unknown error";
      console.warn(`[PIPELINE_WARN] [${sk}] Notification failed: ${msg}`);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[PIPELINE_SUCCESS] [${sk}] Finished in ${duration}s (Footprint skipped)`);

    return goldenRecord;
  } catch (error) {
    const msg = error?.message ? String(error.message) : "Unknown error";
    console.error(`[PIPELINE_FATAL_ERROR] [${sk}] ${msg}`);
    await notifyInvoiceUpdate(sk, "FAILED", `Error: ${msg}`);
    throw error;
  }
};

