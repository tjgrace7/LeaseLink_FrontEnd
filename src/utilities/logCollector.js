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
