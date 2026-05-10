import type { SmsLocationNodeType } from '../../../core/models/sms-location-node.model';

/** Alineado con enum NodeType del esquema AppSync. */
export type GraphqlNodeType = SmsLocationNodeType;

export interface GraphqlNodeDto {
  readonly id: string;
  readonly parentId?: string | null;
  readonly path: string;
  readonly nodeType: GraphqlNodeType;
  readonly name: string;
  /** AppSync devuelve AWSJSON; puede ser string JSON u objeto ya parseado. */
  readonly metadata?: string | Record<string, unknown> | null;
}

export interface LocationMutationResponse {
  readonly success: boolean;
  readonly message?: string | null;
  readonly id?: string | null;
  /** Segmento id de org (sin prefijo ORGANIZATION#) tras crear empresa. */
  readonly nodeId?: string | null;
  readonly path?: string | null;
  readonly entity?: string | Record<string, unknown> | null;
}

export interface SaveNodeGraphqlInput {
  readonly id?: string | null;
  /** Opcional; si falta en ORGANIZATION la Lambda genera UUID (no usar tenant). */
  readonly nodeId?: string | null;
  readonly orgId?: string | null;
  readonly parentId?: string | null;
  readonly nodeType: GraphqlNodeType;
  readonly name: string;
  /** Enviar siempre serializado (AWSJSON). */
  readonly metadata: string;
}

export interface UpdateNodeGraphqlInput {
  readonly name?: string | null;
  readonly metadata?: string | null;
}
