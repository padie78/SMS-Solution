import https from 'https';

export const notifyInvoiceUpdate = async (id, status, message, payload = null) => {
    const appsyncUrl = new URL(process.env.APPSYNC_URL || "https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql");

    // Corregimos la definición para que incluya $message
    const mutation = `
  mutation UpdateStatus($id: ID!, $status: InvoiceStatus!, $data: AWSJSON, $msg: String) {
    updateInvoiceStatus(id: $id, status: $status, extractedData: $data, message: $msg) {
      id
      status
      extractedData
    }
  }
`;

    // Limpiamos el body para asegurar que el ID viaje correctamente
    const body = JSON.stringify({
        query: mutation,
        variables: {
            id: id, // Asegurate que este 'id' incluya el prefijo si tu DB lo usa (ej: "INV#123")
            status: status,
            msg: message || "Update from AI Pipeline",
            data: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null
        }
    });

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
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const response = JSON.parse(data);
                console.log("🚀 AppSync Notification Sent:", JSON.stringify(response));
                resolve(response);
            });
        });

        req.on('error', (err) => {
            console.error("❌ AppSync Notification Error:", err);
            reject(err);
        });

        req.write(body);
        req.end();
    });
};