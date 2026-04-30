// Compatibility shim:
// Some deployments / tools still try to load `index.handler` at the zip root.
// We re-export the real handler compiled to `dist/index.js`.
export { handler } from "./dist/index.js";

