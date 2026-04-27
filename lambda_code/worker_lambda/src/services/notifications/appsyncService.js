import https from 'https';

export const notifyInvoiceUpdate = async (id, status, message, payload = null) => {
    const appsyncUrl = new URL(process.env.APPSYNC_URL || "https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql");

    // Simplificamos los campos de retorno para asegurar que el ID no venga null
    const mutation = `
  mutation UpdateStatus($id: ID!, $status: InvoiceStatus!, $data: AWSJSON, $msg: String) {
    updateInvoiceStatus(id: $id, status: $status, extractedData: $data, message: $msg) {
      id
      status
    }
  }
`;

    const variables = {
        id: id,
        status: status,
        msg: message || "Update from AI Pipeline",
        data: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null
    };

    const body = JSON.stringify({
        query: mutation,
        variables: variables
    });

    // --- LOGS DE SALIDA ---
    console.log("--------------------------------------------------");
    console.log("📤 [NOTIFIER] Preparando envío a AppSync");
    console.log("🆔 ID Enviado:", variables.id);
    console.log("📊 Status:", variables.status);
    console.log("📦 Payload (ExtractedData) length:", variables.data ? variables.data.length : 0);
    console.log("📝 Message:", variables.msg);
    console.log("--------------------------------------------------");

    const options = {
        hostname: appsyncUrl.hostname,
        path: appsyncUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.APPSYNC_API_KEY || "da2-uwvkviowwrfthglgmhirgrib74"
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    
                    if (response.errors) {
                        console.error("❌ [NOTIFIER] Error en la respuesta de AppSync:", JSON.stringify(response.errors, null, 2));
                    } else {
                        console.log("✅ [NOTIFIER] Notificación procesada con éxito:", JSON.stringify(response.data));
                    }
                    
                    resolve(response);
                } catch (e) {
                    console.error("❌ [NOTIFIER] Error parseando respuesta:", responseData);
                    reject(e);
                }
            });
        });

        req.on('error', (err) => {
            console.error("❌ [NOTIFIER] Error de red en HTTPS request:", err);
            reject(err);
        });

        req.write(body);
        req.end();
    });
};