export * from "./client";
// Not part of the generated barrel (@hey-api/openapi-ts keeps the react-query plugin's
// output out of ./client/index.ts to avoid naming collisions with the plain SDK
// functions it wraps), so it's re-exported here instead.
export * from "./client/@tanstack/react-query.gen";
