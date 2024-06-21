import {
    spawnSync,
    type SpawnSyncOptionsWithStringEncoding,
} from 'child_process';
import { mkdir, rm, writeFile } from 'fs/promises';
import { resolve } from 'path';

describe('sample', () => {
    test.each(['esm', 'cjs'])('sample %s', async (dir) => {
        const options = {
            shell: true,
            cwd: resolve(__dirname, 'sample', dir),
            stdio: 'inherit',
            encoding: 'utf8',
        } satisfies SpawnSyncOptionsWithStringEncoding;
        await rm(options.cwd, { recursive: true, force: true });
        await mkdir(options.cwd, { recursive: true });
        const pkg = {
            private: true,
            type: dir === 'cjs' ? 'commonjs' : 'module',
        };
        await writeFile(
            resolve(options.cwd, 'package.json'),
            JSON.stringify(pkg, undefined, 4),
            'utf8',
        );
        await writeFile(
            resolve(options.cwd, 'index.ts'),
            /* ts */ `
                import pLimit from '@sugoroku-y/p-limit';

                const concurrency = 30;
                const count = 1000;
                const limit = pLimit(concurrency);
                let received = '';

                void Promise.all(
                    Array.from({ length: count }, (_, i) =>
                        limit(async (id: number) => {
                            received += id + 's';
                            await new Promise((r) => setTimeout(r, 0));
                            received += id + 'e';
                        }, i),
                    ),
                ).then(() => {
                    function* makeExpected(concurrency: number, count: number) {
                        const numbers = Array.from({length:count}, (_,i) => i);
                        const start = numbers[Symbol.iterator]();
                        const end = numbers[Symbol.iterator]();
                        for (let r = concurrency; r-- >0;) {
                            const {value:s} =  start.next();
                            yield s + 's';
                        }
                        for (const e of end) {
                            yield e + 'e';
                            const {value: s} =  start.next();
                            if (s !== undefined) yield s + 's';
                        }
                    }

                    const expected = ''.concat(...makeExpected(concurrency, count));
                    if (received === expected) {
                        process.exit(0);
                    }
                    console.log('received:', received);
                    console.log('expected:', expected);
                    process.exit(1);
                });
                `,
            'utf8',
        );
        const result1 = spawnSync('npm', ['i', '../../..', 'ts-node'], options);
        expect(result1.status).toBe(0);
        const result2 =
            dir === 'cjs'
                ? spawnSync('npx', ['ts-node', 'index.ts'], options)
                : spawnSync(
                      'node',
                      ['--loader', 'ts-node/esm', 'index.ts'],
                      options,
                  );
        expect(result2.status).toBe(0);
    });
});
