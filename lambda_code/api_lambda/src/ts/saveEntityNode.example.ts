/**
 * Ejemplo de Lambda handler que importa el MISMO Enum desde la Shared Library
 * (`@sms/common`) para validar `entityType` ANTES de escribir en DynamoDB.
 *
 * Beneficios:
 *  - El backend y el frontend comparten una única fuente de verdad.
 *  - Si se añade un nuevo `EntityType` en `@sms/common`, ambos lados rompen
 *    en compilación hasta cubrirlo (drift imposible).
 *  - El campo persistido es el valor técnico (e.g. `"METER"`), nunca traducido.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { EntityType, EntityTypeSchema } from '@sms/common';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env['SMS_TABLE_NAME'] ?? '';

/** Contrato del evento — `entityType` reusa el schema compartido. */
const SaveEntityNodeRequestSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1).max(120),
  entityType: EntityTypeSchema
});
type SaveEntityNodeRequest = z.infer<typeof SaveEntityNodeRequestSchema>;

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  if (!event.body) {
    return jsonResponse(400, { error: 'MISSING_BODY' });
  }

  const parsed = SaveEntityNodeRequestSchema.safeParse(JSON.parse(event.body));
  if (!parsed.success) {
    return jsonResponse(422, {
      error: 'INVALID_PAYLOAD',
      issues: parsed.error.issues
    });
  }

  const request: SaveEntityNodeRequest = parsed.data;
  const nodeId = randomUUID().toUpperCase();

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `TENANT#${request.tenantId}`,
        SK: `${request.entityType}#${nodeId}`,
        sms_et: mapEntityTypeToDiscriminator(request.entityType),
        tenant_id: request.tenantId,
        name: request.name,
        entity_type: request.entityType,
        audit_trail: {
          created_at: new Date().toISOString(),
          source: 'API'
        }
      },
      ConditionExpression: 'attribute_not_exists(PK)'
    })
  );

  return jsonResponse(201, { nodeId, entityType: request.entityType });
};

/**
 * Mapea el valor de presentación (`EntityType`) al tag corto persistido en
 * `sms_et` (alineado a `SmsEntityTag`). Switch exhaustivo: si se añade un
 * nuevo `EntityType` en `@sms/common`, TypeScript falla aquí en compilación.
 */
function mapEntityTypeToDiscriminator(entityType: EntityType): string {
  switch (entityType) {
    case EntityType.ORGANIZATION:
      return 'ORG_CFG';
    case EntityType.BRANCH:
      return 'BR';
    case EntityType.BUILDING:
      return 'BLD';
    case EntityType.METER:
      return 'MET';
    default: {
      const _exhaustive: never = entityType;
      throw new Error(`Unhandled EntityType: ${String(_exhaustive)}`);
    }
  }
}
