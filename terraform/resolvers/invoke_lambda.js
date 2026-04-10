import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      method: ctx.info.fieldName, // Envía 'getYearOverYear', 'getForecast', etc.
      arguments: ctx.arguments,
      identity: ctx.identity,
    },
  };
}

export function response(ctx) {
  return ctx.result;
}