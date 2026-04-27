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
      vendor
      totalAmount
    }
  }
`;

    const body = JSON.stringify({
        query: mutation,
        variables: {
            id: id,
            status: status,
            msg: message, // Ahora sí coincide con $msg arriba
            data: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null
        }
    });

    const options = {
        hostname: appsyncUrl.hostname,
        path: appsyncUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.APPSYNC_API_KEY || "da2-uwvkviowwrfthglgmhirgrib74" // Asegúrate que esta Env Var esté en la Lambda
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