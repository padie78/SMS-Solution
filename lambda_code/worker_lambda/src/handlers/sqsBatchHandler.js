/**
 * @param {{ useCase: { execute: Function } }} deps
 */
export function buildSqsBatchHandler(deps) {
  return async (event, context) => {
    return await deps.useCase.execute({ event, context });
  };
}

