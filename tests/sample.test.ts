import {
    spawn,
    type SpawnOptionsWithoutStdio,
    type SpawnSyncOptionsWithStringEncoding,
} from 'child_process';
import { mkdir, rm, writeFile } from 'fs/promises';
import { basename, resolve } from 'path';

const sampleSource = /* ts */ `
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
`;

const table = {
    esm: {
        type: 'module',
        tsConfig: {
            compilerOptions: {
                target: 'ES2018',
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
            },
            'ts-node': { transpileOnly: true },
        },
        execCommand: [
            'node',
            '--import',
            `"data:text/javascript,${
                /* js */ `
                import { register } from 'node:module';
                import { pathToFileURL } from 'node:url';
                register('ts-node/esm', pathToFileURL('./'));
                `.replaceAll(/\s+/g, '')
            }"`,
            'index.ts',
        ],
    },
    cjs: {
        type: 'commonjs',
        tsConfig: { compilerOptions: { target: 'ES2018' } },
        execCommand: ['npx', 'ts-node', 'index.ts'],
    },
} as const;

const npmInstall = ['npm', 'i', '../../..', 'ts-node', '--install-links'];

describe('sample', () => {
    test.performance.concurrent.each(['esm', 'cjs'] as const)(
        'sample %s',
        async (dir) => {
            const { type, tsConfig, execCommand } = table[dir];
            const options = {
                shell: true,
                cwd: resolve(__dirname, 'sample', dir),
                encoding: 'utf8',
            } satisfies SpawnSyncOptionsWithStringEncoding;
            await rm(options.cwd, { recursive: true, force: true });
            await mkdir(options.cwd, { recursive: true });
            await writeJson(resolve(options.cwd, 'package.json'), {
                private: true,
                type,
            });
            await writeJson(resolve(options.cwd, 'tsconfig.json'), tsConfig);
            await writeFile(
                resolve(options.cwd, 'index.ts'),
                sampleSource,
                'utf8',
            );
            expect(await spawnPromises(options, ...npmInstall)).toBe(0);
            expect(await spawnPromises(options, ...execCommand)).toBe(0);
        },
        60000,
    );
});

function writeJson(path: string, json: unknown) {
    return writeFile(path, JSON.stringify(json, undefined, 4), 'utf8');
}

function spawnPromises(
    options: SpawnOptionsWithoutStdio,
    ...[command, ...args]: string[]
) {
    const headings =
        typeof options.cwd === 'string' ? `${basename(options.cwd)}: ` : '';
    process.stdout.write(headings + [command, ...args].join(' ').concat('\n'));
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
