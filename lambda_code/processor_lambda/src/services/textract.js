const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");
const { QUERIES_BY_CATEGORY } = require("../constants/extraction_queries");

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
 * * @param {string} bucket - S3 Bucket origen.
 * @param {string} key - S3 Key del archivo (Factura/Imagen).
 * @param {string} category - Categoría (ELEC, GAS, LOGISTICS, OTHERS).
 * @returns {Promise<Object>} - rawText (para Bedrock) y queryHints (datos limpios).
 */
exports.extractText = async (bucket, key, category = "OTHERS") => {
    console.log(`🔍 [TEXTRACT_START]: Procesando [${category}] | s3://${bucket}/${key}`);

    // 1. Obtenemos el set de queries (Base + Específicas) desde nuestras constantes
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
            Queries: queries
        }
    };

    try {
        const command = new AnalyzeDocumentCommand(params);
        const response = await client.send(command);

        if (!response.Blocks) {
            throw new Error("Textract no devolvió bloques de datos. El archivo podría estar corrupto.");
        }

        // 2. Extraemos el Texto Crudo (LINEs)
        // Esto sirve para que Bedrock tenga el contexto semántico completo.
        const rawText = response.Blocks
            .filter(block => block.BlockType === "LINE")
            .map(block => block.Text)
            .join("\n");

        // 3. Mapeamos los resultados de las QUERIES a un objeto plano (queryHints)
        const queryHints = {};
        const queryBlocks = response.Blocks.filter(b => b.BlockType === "QUERY");
        const resultBlocks = response.Blocks.filter(b => b.BlockType === "QUERY_RESULT");

        queryBlocks.forEach(qBlock => {
            const alias = qBlock.Query.Alias;
            const relationship = qBlock.Relationships?.find(r => r.Type === "ANSWER");
            
            if (relationship) {
                // Buscamos el bloque de respuesta vinculado al ID de la query
                const answerBlock = resultBlocks.find(r => relationship.Ids.includes(r.Id));
                queryHints[alias] = answerBlock ? answerBlock.Text : null;
            } else {
                queryHints[alias] = null;
            }
        });

        // Log de trazabilidad para CloudWatch
        const foundFields = Object.values(queryHints).filter(v => v !== null).length;
        console.log(`✅ [TEXTRACT_SUCCESS]: Se extrajeron ${foundFields}/${queries.length} campos.`);

        return {
            rawText,        // Input sucio pero completo para Bedrock
            queryHints,     // Datos "Gold" validados por la visión de Textract
            category,
            confidence: response.Blocks[0]?.Confidence || 0
        };

    } catch (error) {
        console.error(`❌ [TEXTRACT_ERROR] en ${key}:`, error.message);
        // Propagamos el error para que el index.js lo capture y maneje el flujo
        throw error;
    }
};