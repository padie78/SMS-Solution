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
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify(messageBody),
        }));

        console.log(`✅ [DISPATCHER] | Mensaje encolado con éxito.`);
        
        return { success: true, message: "Enqueued" };

    } catch (error) {
        console.error(`❌ [DISPATCHER_ERROR]: ${error.message}`);
        throw error;
    }
};