import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

// 1. Instanciamos el cliente FUERA del handler para reutilizar la conexión (Best Practice)
const sqs = new SQSClient({}); 

export const dispatchInvoice = async (bucket, key, orgId) => {
    try {
        console.log(`📝 [DISPATCHER] | Despachando a SQS: ${key}`);

        const messageBody = {
            bucket,
            key,
            orgId,
            timestamp: new Date().toISOString(),
            status: "PENDING_WORKER"
        };

        // 2. Ahora 'sqs' ya está definido y disponible aquí
        await sqs.send(new SendMessageCommand({
            QueueUrl: "https://sqs.eu-central-1.amazonaws.com/473959757331/sms-platform-invoice-queue-dev", // Reemplaza con tu URL de SQS
            MessageBody: JSON.stringify(messageBody),
        }));

        console.log(`✅ [DISPATCHER] | Mensaje encolado con éxito.`);
        
        return { success: true, message: "Enqueued" };

    } catch (error) {
        // Aquí es donde capturabas el "sqs is not defined"
        console.error(`❌ [DISPATCHER_ERROR]: ${error.message}`);
        throw error;
    }
};