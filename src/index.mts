import { createRequire } from 'module';
import type { LimitFunction } from './index.js';
const require = createRequire(import.meta.url);
const { default: pLimit } = require('.') as {
    default: (concurrencySpec: number) => LimitFunction;
};
export default pLimit;
