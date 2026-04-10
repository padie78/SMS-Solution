import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year } = ctx.arguments;
    const orgId = ctx.identity.claims['custom:orgId']; // Seguridad: solo sus datos

    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
            PK: `ORG#${orgId}`,
            SK: `STATS#YEAR#${year}`
        }),
    };
}