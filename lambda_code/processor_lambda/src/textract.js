const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");

const client = new TextractClient({ region: process.env.AWS_REGION });

exports.extraerTexto = async (bucket, key) => {
    try {
        const command = new DetectDocumentTextCommand({
            Document: { S3Object: { Bucket: bucket, Name: key } }
        });
        const response = await client.send(command);
        
        // Unimos todas las líneas de texto detectadas
        const texto = response.Blocks
            .filter(b => b.BlockType === "LINE")
            .map(b => b.Text)
            .join(" ");

        if (!texto) throw new Error("Textract no detectó contenido en el documento.");
        return texto;
    } catch (error) {
        console.error("Error en Textract:", error);
        throw new Error(`Error de Visión: ${error.message}`);
    }
};