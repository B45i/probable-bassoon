export * from "./client";
// Neither is part of the generated barrel (@hey-api/openapi-ts keeps the react-query
// plugin's output, and the configured `client` singleton itself, out of
// ./client/index.ts to avoid naming collisions with the plain SDK functions it wraps),
// so both are re-exported here instead.
export * from "./client/@tanstack/react-query.gen";
export { client } from "./client/client.gen";
