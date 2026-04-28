import https from 'https';

/**
 * Notifies AppSync (via GraphQL Mutation) about invoice processing updates.
 * This triggers real-time updates in the frontend via Subscriptions.
 */
export const notifyInvoiceUpdate = async (id, status, message, payload = null) => {
    const appsyncUrl = new URL(process.env.APPSYNC_URL || "https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql");
    const apiKey = process.env.APPSYNC_API_KEY || "da2-uwvkviowwrfthglgmhirgrib74";

    const mutation = `
        mutation UpdateStatus($id: ID!, $status: InvoiceStatus!, $data: AWSJSON, $msg: String) {
            updateInvoiceStatus(id: $id, status: $status, extractedData: $data, message: $msg) {
                id
                status
                message
            }
        }
    `;

    const variables = {
        id,
        status,
        msg: message || "Update from AI Pipeline",
        data: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null
    };

    const postData = JSON.stringify({
        query: mutation,
        variables
    });

    console.log(`[NOTIFIER_START] [${id}] Dispatching status update: ${status}`);
    console.log(`[NOTIFIER_META] Payload size: ${variables.data ? variables.data.length : 0} characters`);

    const options = {
        hostname: appsyncUrl.hostname,
        path: appsyncUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseBody);
                    
                    if (result.errors) {
                        console.error(`[NOTIFIER_GRAPHQL_ERROR] [${id}] AppSync rejected the mutation.`);
                        console.error(`[DETAILS]: ${JSON.stringify(result.errors)}`);
                        return resolve(result); // Resolve to allow pipeline to continue even if UI fails
                    }

                    console.log(`[NOTIFIER_SUCCESS] [${id}] Real-time update pushed to AppSync.`);
                    resolve(result);
                } catch (parseError) {
                    console.error(`[NOTIFIER_PARSE_ERROR] [${id}] Failed to parse AppSync response: ${responseBody}`);
                    reject(parseError);
                }
            });
        });

        req.on('error', (networkError) => {
            console.error(`[NOTIFIER_NETWORK_ERROR] [${id}] HTTPS Request failed: ${networkError.message}`);
            reject(networkError);
        });

        req.write(postData);
        req.end();
    });
};