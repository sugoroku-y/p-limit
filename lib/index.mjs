import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { default: pLimit } = require('.');
export default pLimit;
