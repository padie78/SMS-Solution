const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");
const client = new TextractClient({ region: process.env.AWS_REGION || "us-east-1" });

async function extraerTexto(bucket, key) {
    const params = {
        Document: { S3Object: { Bucket: bucket, Name: key } },
        FeatureTypes: ["TABLES", "FORMS"]
    };

    try {
        const command = new AnalyzeDocumentCommand(params);
        const response = await client.send(command);
        
        // Convertimos el mapa de bloques de Textract en un string legible para la IA
        return response.Blocks
            .filter(b => b.BlockType === "LINE")
            .map(b => b.Text)
            .join(" ");
    } catch (error) {
        console.error("Error en Textract:", error);
        throw error;
    }
}

module.exports = { extraerTexto };