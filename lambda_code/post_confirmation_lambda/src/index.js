import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from "node:crypto";

/**
 * Post Confirmation: asegura custom:tenant_id para que viaje en el Id Token.
 *
 * TENANT_ID_STRATEGY (env):
 * - sub (default): mismo valor que el sub de Cognito (estable por usuario).
 * - uuid: nuevo UUID por usuario (cada alta = nuevo holding lógico).
 *
 * Solo actúa en altas confirmadas, no en flujos ajenos al signup.
 */
export async function handler(event) {
  const trigger = event.triggerSource ?? "";

  const allowed =
    trigger === "PostConfirmation_ConfirmSignUp" ||
    trigger === "PostConfirmation_Autoconfirm";

  if (!allowed) {
    return event;
  }

  const userPoolId = event.userPoolId;
  const username = event.userName;
  const sub = event.request?.userAttributes?.sub;

  const existing = event.request?.userAttributes?.["custom:tenant_id"];
  if (existing != null && String(existing).trim() !== "") {
    return event;
  }

  if (!userPoolId || !username) {
    console.warn("[post_confirmation] missing userPoolId or userName", { trigger });
    return event;
  }

  const strategy = (process.env.TENANT_ID_STRATEGY || "sub").toLowerCase();
  let tenantValue;
  if (strategy === "uuid") {
    tenantValue = randomUUID().toUpperCase();
  } else {
    tenantValue = sub;
  }

  if (!tenantValue || String(tenantValue).trim() === "") {
    console.error("[post_confirmation] cannot derive tenant id (no sub)");
    return event;
  }

  const client = new CognitoIdentityProviderClient({});
  await client.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [{ Name: "custom:tenant_id", Value: String(tenantValue).trim() }]
    })
  );

  console.log("[post_confirmation] set custom:tenant_id for user", username);
  return event;
}
