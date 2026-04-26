// El nombre ahora refleja que es un mensajero, no un operario
export const dispatchInvoice = async (bucket, key, orgId) => {
    try {
        console.log(`📝 [DISPATCHER] | Despachando a SQS: ${key}`);

        const messageBody = {
            bucket,
            key,
            orgId,
            timestamp: new Date().toISOString(),
            status: "PENDING_WORKER" // Cambié el status para ser más claro
        };

        await sqs.send(new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL || "https://sqs.eu-central-1.amazonaws.com/473959757331/sms-platform-invoice-queue-dev", // Asegúrate de configurar esta variable de entorno
            MessageBody: JSON.stringify(messageBody),
        }));

        console.log(`✅ [DISPATCHER] | Mensaje encolado con éxito.`);
        
        return { success: true, message: "Enqueued" };

    } catch (error) {
        console.error(`❌ [DISPATCHER_ERROR]: ${error.message}`);
        throw error;
    }
};