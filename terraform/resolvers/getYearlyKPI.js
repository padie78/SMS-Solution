import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      year: ctx.arguments.year,
      method: 'getYearlyKPI'
    },
  };
}

export function response(ctx) {
  return ctx.result;
}