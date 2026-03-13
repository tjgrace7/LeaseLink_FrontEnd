/**
 * logCollector.js — global console interceptor for log/error collection.
 *
 * Imported once at the top of main.jsx so it is active for the entire app
 * lifetime. Monkey-patches console.log, console.error, and console.warn to
 * buffer all messages while still passing them through to the original
 * implementation (so DevTools output is unchanged).
 *
 * Also installs a window.onerror handler to capture uncaught JS errors.
 *
 * Collected entries can be retrieved or cleared via the exported helpers:
 *  getLogs()   — returns all [LOG] and [WARN] lines joined by newline
 *  getErrors() — returns all [ERROR] and [ONERROR] lines joined by newline
 *  clearLogs() — empties both buffers
 *
 * Typical use: include the buffer in support tickets (see TicketSystem.jsx).
 */
const logBuffer = [];
const errorBuffer = [];

const originalLog = console.log?.bind(console);
const originalError = console.error?.bind(console);
const originalWarn = console.warn?.bind(console);

console.log = (...args) => {
  try {
    logBuffer.push(`[LOG] ${args.map(String).join(" ")}`);
    originalLog(...args);
  } catch (e) {
    originalLog?.("Failed to capture console.log:", e);
  }
};

console.error = (...args) => {
  try {
    errorBuffer.push(`[ERROR] ${args.map(String).join(" ")}`);
    originalError(...args);
  } catch (e) {
    originalLog?.("Failed to capture console.error:", e);
  }
};

console.warn = (...args) => {
  try {
    logBuffer.push(`[WARN] ${args.map(String).join(" ")}`);
    originalWarn(...args);
  } catch (e) {
    originalLog?.("Failed to capture console.warn:", e);
  }
};

window.onerror = (message, source, lineno, colno, error) => {
  const msg = `[ONERROR] ${message} at ${source}:${lineno}:${colno}`;
  errorBuffer.push(msg);
};

// Utility functions
export function getLogs() {
  return logBuffer.join('\n');
}

export function getErrors() {
  return errorBuffer.join('\n');
}

export function clearLogs() {
  logBuffer.length = 0;
  errorBuffer.length = 0;
}
