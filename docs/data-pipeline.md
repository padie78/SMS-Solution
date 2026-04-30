# EkoLedger Data Ingestion Pipeline

## 1. Capture Phase
- **Entry Points:** SES (Email), S3 Direct, Fiscal API, Mobile App.
- **Landing Zone:** `s3://ekoledger-raw-documents/<tenant_id>/<source>/<filename>`

## 2. Extraction Phase (AI Orchestration)
1. **Trigger:** S3 Event -> Lambda `DocumentProcessor`.
2. **OCR:** AWS Textract (for structure) + Amazon Bedrock (Claude 3.5 Sonnet for semantic cleanup).
3. **Validation:** Check `total_amount`, `date`, and `billing_period`.

## 3. Sustainability Enrichment
1. **Normalization:** Convert units (Liters/BTU/m3) to standard kWh using `mathjs`.
2. **Climatiq Call:** Fetch Emission Factor based on `activity_id` and `region`.
3. **Calculation:** `Activity Data * Emission Factor = CO2e`.

## 4. Persistence & Aggregation
1. **Write:** Save specific record to DynamoDB.
2. **Stream:** DynamoDB Stream triggers `AggregatorLambda`.
3. **Update:** Atomically increment `STATS#MONTHLY` and `STATS#WEEKLY` items for real-time dashboards.