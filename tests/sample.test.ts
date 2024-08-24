import {
    spawn,
    type SpawnOptionsWithoutStdio,
    type SpawnSyncOptionsWithStringEncoding,
} from 'child_process';
import { mkdir, rm, writeFile } from 'fs/promises';
import { basename, resolve } from 'path';

describe('sample', () => {
    test.performance.each(['esm', 'cjs'])(
        'sample %s',
        async (dir) => {
            const options = {
                shell: true,
                cwd: resolve(__dirname, 'sample', dir),
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
            const tsConfig = {
                compilerOptions: {
                    target: 'ES2018',
                    ...(dir === 'esm' && {
                        module: 'NodeNext',
                        moduleResolution: 'NodeNext',
                    }),
                },
                ...(dir === 'esm' && {
                    'ts-node': {
                        transpileOnly: true,
                    },
                }),
            };
            await writeFile(
                resolve(options.cwd, 'tsconfig.json'),
                JSON.stringify(tsConfig, undefined, 4),
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
                        console.log('success');
                        process.exit(0);
                    }
                    console.log('received:', received);
                    console.log('expected:', expected);
                    process.exit(1);
                });
                `,
                'utf8',
            );
            await expect(
                spawnPromises(
                    options,
                    'npm',
                    'i',
                    '../../..',
                    'ts-node',
                    '--install-links',
                ),
            ).resolves.toBe(0);
            await expect(
                spawnPromises(
                    options,
                    ...(dir === 'cjs'
                        ? ['npx', 'ts-node', 'index.ts']
                        : [
                              'node',
                              '--import',
                              /* js */ `"data:text/javascript,
                                import { register } from 'node:module';
                                import { pathToFileURL } from 'node:url';
                                register('ts-node/esm', pathToFileURL('./'));
                                "`.replaceAll(/\s+/g, ''),
                              'index.ts',
                          ]),
                ),
            ).resolves.toBe(0);
        },
        60000,
    );
});

function spawnPromises(
    options: SpawnOptionsWithoutStdio,
    ...[command, ...args]: string[]
) {
    process.stdout.write([command, ...args].join(' ').concat('\n'));
    const headings =
        typeof options.cwd === 'string' ? `${basename(options.cwd)}: ` : '';
    const npm = spawn(command, args, options);
    return new Promise<number>((resolve, reject) => {
        npm.once('exit', (status) =>
            status != null ? resolve(status) : reject(new Error()),
        );
        npm.stdout?.on('data', (chunk: Buffer) => {
            process.stdout.write(String(chunk).replace(/^(?=.)/gm, headings));
        });
        npm.stderr?.on('data', (chunk: Buffer) => {
            process.stderr.write(String(chunk).replace(/^(?=.)/gm, headings));
        });
    });
}
