// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

// Monkey patch console methods to capture swallowed React SSR errors
const originalConsole = {
  error: console.error,
  warn: console.warn,
  log: console.log,
  info: console.info,
};

function intercept(...args: any[]) {
  if (args[0]) {
    record(args[0]);
  }
}

console.error = function (...args: any[]) {
  intercept(...args);
  originalConsole.error.apply(console, args);
};
console.warn = function (...args: any[]) {
  intercept(...args);
  originalConsole.warn.apply(console, args);
};
console.log = function (...args: any[]) {
  intercept(...args);
  originalConsole.log.apply(console, args);
};
console.info = function (...args: any[]) {
  intercept(...args);
  originalConsole.info.apply(console, args);
};

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
