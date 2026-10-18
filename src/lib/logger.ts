// log/info are dev-only noise; warn/error always reach the console (and crash reporters later).
const noop = () => undefined;

export const logger = {
  log: __DEV__ ? console.log : noop,
  info: __DEV__ ? console.info : noop,
  warn: console.warn,
  error: console.error,
};
