import { readFile } from 'fs/promises';

describe('identify', () => {
    test('index.ts <=> index.mts', async () => {
        const index_ts = await readFile('./src/index.ts', 'utf8');
        const index_mts = await readFile('./src/index.mts', 'utf8');
        expect(index_mts).toBe(index_ts);
    });
});
