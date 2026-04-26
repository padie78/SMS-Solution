import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({}); 

// 1. Agregamos 'sk' a los parámetros
export const dispatchInvoice = async (bucket, key, orgId, sk) => {
    try {
        console.log(`📝 [DISPATCHER] | Despachando a SQS: ${key}`);

        const messageBody = {
            bucket,
            key,
            orgId,
            sk, // 2. IMPORTANTE: Ahora el Worker sí lo va a encontrar
            timestamp: new Date().toISOString(),
            status: "PENDING_WORKER"
        };

        await sqs.send(new SendMessageCommand({
            // Tip: Usá process.env.QUEUE_URL si podés para no hardcodear el ID de cuenta
            QueueUrl: "https://sqs.eu-central-1.amazonaws.com/473959757331/sms-platform-invoice-queue-dev", 
            MessageBody: JSON.stringify(messageBody),
        }));

        console.log(`✅ [DISPATCHER] | Mensaje encolado con éxito: ${sk}`);
        
        return { success: true, message: "Enqueued" };

    } catch (error) {
        console.error(`❌ [DISPATCHER_ERROR]: ${error.message}`);
        throw error;
    }
};