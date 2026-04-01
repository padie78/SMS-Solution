import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";
import { QUERIES_BY_CATEGORY } from "../constants/extraction_queries.js";

const client = new TextractClient({ 
    region: process.env.AWS_REGION || "eu-central-1",
    maxAttempts: 3 
});

export const extractText = async (bucket, key, category = "OTHERS") => {
    // --- LOG START ---
    console.log(`   [TEXTRACT_START]: Procesando [${category}] | s3://${bucket}/${key}`);

    const queries = QUERIES_BY_CATEGORY[category] || QUERIES_BY_CATEGORY.OTHERS;

    if (!QUERIES_BY_CATEGORY[category]) {
        console.warn(`      ⚠️ [CATEGORY_FALLBACK]: Categoría '${category}' no encontrada. Usando [OTHERS].`);
    }

    const params = {
        Document: { S3Object: { Bucket: bucket, Name: key } },
        FeatureTypes: ["QUERIES"],
        QueriesConfig: {
            Queries: queries.map(q => ({
                Text: q.Text,
                Alias: q.Alias
            }))
        }
    };

    try {
        const command = new AnalyzeDocumentCommand(params);
        const response = await client.send(command);

        if (!response || !response.Blocks) {
            throw new Error("Textract no devolvió bloques de datos.");
        }

        // 1. Extraer Texto Crudo (LINEs)
        const rawText = response.Blocks
            .filter(block => block.BlockType === "LINE")
            .map(block => block.Text)
            .join("\n");

        // 2. Mapeo de resultados y Confidence Scores
        const queryHints = {};
        const queryDetails = [];
        
        const queryBlocks = response.Blocks.filter(b => b.BlockType === "QUERY");
        const resultBlocks = response.Blocks.filter(b => b.BlockType === "QUERY_RESULT");

        queryBlocks.forEach(qBlock => {
            const alias = qBlock.Query.Alias;
            const relationship = qBlock.Relationships?.find(r => r.Type === "ANSWER");
            
            if (relationship && relationship.Ids.length > 0) {
                const answerBlock = resultBlocks.find(r => relationship.Ids.includes(r.Id));
                if (answerBlock) {
                    queryHints[alias] = answerBlock.Text;
                    queryDetails.push({
                        Field: alias,
                        Value: answerBlock.Text,
                        Confidence: `${answerBlock.Confidence.toFixed(2)}%`
                    });
                }
            } else {
                queryHints[alias] = "NOT_FOUND";
                queryDetails.push({ Field: alias, Value: "NOT_FOUND", Confidence: "0%" });
            }
        });

        // --- DEBUG: TABLA DE EXTRACCIÓN (Opcional, útil en Dev) ---
        console.table(queryDetails);

        // --- LOG END (Resumen en una sola fila) ---
        const foundFields = Object.values(queryHints).filter(v => v !== "NOT_FOUND").length;
        const confAvg = response.Blocks[0]?.Confidence || 0;
        
        console.log(`   [TEXTRACT_END]: Extracción completada | Hits: ${foundFields}/${queries.length} | Conf: ${confAvg.toFixed(2)}% | Total: ${queryHints.TOTAL_AMOUNT || 'N/A'}`);

        return {
            rawText,
            queryHints,
            category,
            confidence: confAvg
        };

    } catch (error) {
        console.error(`   ❌ [TEXTRACT_ERROR] en ${key}:`, error.message);
        throw error;
    }
};

export default { extractText };