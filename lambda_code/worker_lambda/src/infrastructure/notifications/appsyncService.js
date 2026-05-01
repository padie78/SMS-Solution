import https from "https";

/**
 * Dispatches a GraphQL mutation to AppSync to update invoice status in real-time.
 */
export const notifyInvoiceUpdate = async (id, status, message, payload = null) => {
  const appsyncUrl = new URL(
    process.env.APPSYNC_URL ||
      "https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql"
  );
  const apiKey = process.env.APPSYNC_API_KEY || "da2-uwvkviowwrfthglgmhirgrib74";

  const mutation = `
        mutation UpdateStatus($id: ID!, $status: InvoiceStatus!, $data: AWSJSON, $msg: String) {
            updateInvoiceStatus(id: $id, status: $status, extractedData: $data, message: $msg) {
                id
                status
                extractedData
            }
        }
    `;

  // IMPORTANT:
  // `AWSJSON` supports sending JSON *objects* as GraphQL variables.
  // Sending a pre-stringified JSON often ends up double-escaped on the client.
  // We normalize here so the frontend receives a well-formed object.
  let normalizedPayload = payload;
  if (typeof normalizedPayload === "string") {
    const s = normalizedPayload.trim();
    // If it's JSON-in-a-string, parse it once so it becomes an object.
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      try {
        normalizedPayload = JSON.parse(s);
      } catch {
        // keep as-is (may be a plain message); client should treat as string
      }
    }
  }

  const variables = {
    id,
    status,
    msg: message || "Update from AI Pipeline",
    data: normalizedPayload ?? null
  };

  const postBody = JSON.stringify({
    query: mutation,
    variables
  });

  console.log("[NOTIFIER_START] Preparing AppSync dispatch...");
  console.log(`[NOTIFIER_META] ID: ${variables.id} | Status: ${variables.status}`);
  const payloadLen =
    typeof variables.data === "string"
      ? variables.data.length
      : variables.data
        ? JSON.stringify(variables.data).length
        : 0;
  console.log(`[NOTIFIER_META] Payload length: ${payloadLen} characters`);
  console.log(`[NOTIFIER_META] Message: ${variables.msg}`);

  const options = {
    hostname: appsyncUrl.hostname,
    path: appsyncUrl.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        try {
          const result = JSON.parse(responseBody);

          if (result.errors) {
            console.error("[NOTIFIER_GRAPHQL_ERROR] AppSync rejected the mutation:");
            console.error(JSON.stringify(result.errors, null, 2));
            resolve(result);
          } else {
            console.log("[NOTIFIER_SUCCESS] Notification processed successfully.");
            console.log(`[NOTIFIER_DATA] Response: ${JSON.stringify(result.data)}`);
            resolve(result);
          }
        } catch (parseError) {
          console.error(`[NOTIFIER_PARSE_ERROR] Failed to parse response: ${responseBody}`);
          reject(parseError);
        }
      });
    });

    req.on("error", (networkError) => {
      const msg = networkError?.message ? String(networkError.message) : "Unknown error";
      console.error(`[NOTIFIER_NETWORK_ERROR] HTTPS request failed: ${msg}`);
      reject(networkError);
    });

    req.write(postBody);
    req.end();
  });
};

