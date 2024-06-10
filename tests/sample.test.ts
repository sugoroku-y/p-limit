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

                const limit = pLimit(3);

                void Promise.all(
                    Array.from({ length: 10 }, (_, i) =>
                        limit(async (id) => {
                            console.log(id, 'start');
                            await new Promise((r) => setTimeout(r, 100 + 900 * Math.random()));
                            console.log(id, 'end');
                        }, i),
                    ),
                ).then(console.log);
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
