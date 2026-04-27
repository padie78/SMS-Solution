import https from 'https';

/**
 * Envía una notificación de estado a AppSync para que el Front la reciba vía WebSocket.
 */
export const notifyInvoiceUpdate = async (id, status, message, payload = null) => {
    const appsyncUrl = new URL(process.env.APPSYNC_URL || "https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql");

    const mutation = `
  mutation UpdateStatus($id: ID!, $status: InvoiceStatus!, $data: AWSJSON) {
    updateInvoiceStatus(id: $id, status: $status, extractedData: $data) {
      id
      status
      extractedData
    }
  }
`;
    const body = JSON.stringify({
        query: mutation,
        variables: {
            id,
            status,
            msg: message,
            data: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null
        }
    });

    const options = {
        hostname: appsyncUrl.hostname,
        path: appsyncUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.APPSYNC_API_KEY
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', (err) => {
            console.error("Error calling AppSync:", err);
            reject(err);
        });

        req.write(body);
        req.end();
    });
};