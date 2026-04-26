import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({});

export const processInvoice = async (bucket, key, orgId) => {
    try {
        console.log(`📝 [PROCESS_LOGIC] | Preparando despacho a SQS para: ${key}`);

        const messageBody = {
            bucket,
            key,
            orgId,
            timestamp: new Date().toISOString(),
            status: "READY_FOR_OCR"
        };

        // El envío a la cola sucede aquí adentro
        await sqs.send(new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify(messageBody),
        }));

        console.log(`✅ [PROCESS_LOGIC] | Despacho exitoso.`);
        
        return { success: true, message: "Enqueued for processing" };

    } catch (error) {
        console.error(`❌ [PROCESS_LOGIC_ERROR]: ${error.message}`);
        throw error;
    }
};