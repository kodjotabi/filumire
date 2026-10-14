// Initialize the runtime expected by Next before test-only TypeScript imports.
globalThis.AsyncLocalStorage ??= require('node:async_hooks').AsyncLocalStorage;
