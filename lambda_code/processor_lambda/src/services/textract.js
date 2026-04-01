// 1. Importaciones ESM
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";
// Importante: Incluir la extensión .js en archivos locales
import { QUERIES_BY_CATEGORY } from "../constants/extraction_queries.js";

/**
 * Optimizamos el cliente fuera del handler para reutilizar conexiones TCP.
 * Configuramos reintentos para manejar picos de carga en el pipeline.
 */
const client = new TextractClient({ 
    region: process.env.AWS_REGION || "eu-central-1",
    maxAttempts: 3 
});

/**
 * Servicio de Extracción de Datos mediante Amazon Textract Queries.
 * @param {string} bucket - S3 Bucket origen.
 * @param {string} key - S3 Key del archivo.
 * @param {string} category - Categoría (ELEC, GAS, LOGISTICS, OTHERS).
 */
export const extractText = async (bucket, key, category = "OTHERS") => {
    console.log(`🔍 [TEXTRACT_START]: Procesando [${category}] | s3://${bucket}/${key}`);

    // Obtenemos el set de queries (Base + Específicas)
    const queries = QUERIES_BY_CATEGORY[category] || QUERIES_BY_CATEGORY.OTHERS;

    const params = {
        Document: {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        },
        FeatureTypes: ["QUERIES"],
        QueriesConfig: {
            // El SDK v3 espera un array de objetos { Text, Alias }
            Queries: queries.map(q => ({
                Text: q.Text,
                Alias: q.Alias
            }))
        }
    };

    try {
        const command = new AnalyzeDocumentCommand(params);
        const response = await client.send(command);

        if (!response.Blocks) {
            throw new Error("Textract no devolvió bloques de datos.");
        }

        // 2. Extraemos el Texto Crudo (LINEs) para el análisis semántico de Bedrock
        const rawText = response.Blocks
            .filter(block => block.BlockType === "LINE")
            .map(block => block.Text)
            .join("\n");

        // 3. Mapeamos los resultados de las QUERIES a un objeto plano (queryHints)
        const queryHints = {};
        
        // Filtramos bloques para búsquedas más eficientes
        const queryBlocks = response.Blocks.filter(b => b.BlockType === "QUERY");
        const resultBlocks = response.Blocks.filter(b => b.BlockType === "QUERY_RESULT");

        queryBlocks.forEach(qBlock => {
            const alias = qBlock.Query.Alias;
            const relationship = qBlock.Relationships?.find(r => r.Type === "ANSWER");
            
            if (relationship && relationship.Ids.length > 0) {
                // Buscamos el bloque de respuesta vinculado
                const answerBlock = resultBlocks.find(r => relationship.Ids.includes(r.Id));
                queryHints[alias] = answerBlock ? answerBlock.Text : null;
            } else {
                queryHints[alias] = null;
            }
        });

        const foundFields = Object.values(queryHints).filter(v => v !== null).length;
        console.log(`✅ [TEXTRACT_SUCCESS]: Se extrajeron ${foundFields}/${queries.length} campos.`);

        return {
            rawText,
            queryHints,
            category,
            confidence: response.Blocks[0]?.Confidence || 0
        };

    } catch (error) {
        console.error(`❌ [TEXTRACT_ERROR] en ${key}:`, error.message);
        throw error;
    }
};

// 4. Exportación por defecto para mantener consistencia con index.js
export default { extractText };