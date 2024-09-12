import { spawn } from 'child_process';
import { Queue } from '../src/Queue';
import wrappedImport from './wrappedImport';
import Queue1 from './performance/Queue1';
import Queue2 from './performance/Queue2';
import Queue3 from './performance/Queue3';
import Queue4 from './performance/Queue4';
import Queue5 from './performance/Queue5';
import Queue6 from './performance/Queue6';
import { measureLimit } from './measureLimit';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- ts-jestで実行時にはエラーにならないので@ts-ignoreを使う
// @ts-ignore 型としてのimportなのでCommonJSかESModuleかは関係ない
const YoctoQueue = wrappedImport<typeof import('yocto-queue')>('yocto-queue');

describe('Queue', () => {
    let YoctoQueueClass: Awaited<typeof YoctoQueue>['default'];
    const yoctoQ = <T>() => new YoctoQueueClass<T>();
    beforeAll(async () => {
        ({ default: YoctoQueueClass } = await YoctoQueue);
    });
    test.each([
        ['yocto-queue', yoctoQ],
        ['mime', Queue],
        ['Queue1', Queue1],
        ['Queue2', Queue2],
        ['Queue3', Queue3],
        ['Queue4', Queue4],
        ['Queue5', Queue5],
        ['Queue6', Queue6],
    ])('compatible %s', (_, Queue) => {
        const log: unknown[] = [];
        const queue = Queue<number>();
        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);
        expect([...queue]).toEqual([1, 2, 3]);
        log.push(queue.dequeue());
        expect([...queue]).toEqual([2, 3]);
        log.push(queue.dequeue());
        log.push(queue.dequeue());
        log.push(queue.dequeue());
        expect([...queue]).toEqual([]);
        queue.enqueue(11);
        queue.enqueue(12);
        queue.enqueue(13);
        expect(queue.peek()).toBe(11);
        expect([...queue]).toEqual([11, 12, 13]);
        log.push(queue.dequeue());
        log.push(queue.dequeue());
        log.push(queue.dequeue());
        log.push(queue.dequeue());
        expect(log).toEqual([1, 2, 3, undefined, 11, 12, 13, undefined]);
        queue.enqueue(9);
        queue.enqueue(8);
        queue.enqueue(7);
        expect(queue.size).toBe(3);
        queue.clear();
        expect(queue.size).toBe(0);
    });
    test('method', () => {
        const queue = Queue<number>();
        (0, queue.enqueue)(1);
        expect(queue.dequeue()).toBe(1);
    });
    test('method yocto-queue', () => {
        const queue = yoctoQ<number>();
        // eslint-disable-next-line @typescript-eslint/unbound-method -- -
        expect(() => (0, queue.enqueue)(1)).toThrow();
    });
    test('mass', () => {
        const queue = Queue<number>();
        queue.enqueue(0);
        for (let i = 1; i <= queue.blockSize; ++i) {
            queue.enqueue(i);
            queue.dequeue();
        }
        expect(queue.size).toBe(1);
        for (let i = 1; i <= 3; ++i) {
            queue.enqueue(i);
        }
        expect([...queue]).toEqual([queue.blockSize, 1, 2, 3]);
        while (queue.peek() !== undefined) {
            queue.dequeue();
        }
        expect(queue.size).toBe(0);
        for (let i = 0; i <= queue.blockSize; ++i) {
            queue.enqueue(i);
        }
        expect(queue.size).toBe(queue.blockSize + 1);
        expect([...queue].every((e, i) => e === i)).toBe(true);
    });
    describe('limit', () => {
        const results: Record<string, number> = {};
        const scriptForMeasurement = /* js */ `
            const queue = new Queue();
            let i = 0;
            for (; ; ) {
                queue.enqueue(() => new Promise(() => {}));
                console.log(++i);
            }`;

        test.performance.concurrent(
            'mine',
            async () => {
                const result = await measureLimit(/* js */ `
                    const { Queue } = require('./lib/Queue');
                    ${scriptForMeasurement}`);
                expect(result).toBeGreaterThan(0);
                results['mine'] = result;
            },
            600000,
        );
        test.performance.concurrent(
            'yocto-queue',
            async () => {
                const result = await measureLimit(/* js */ `
                    const { default: Queue } = await import('yocto-queue');
                    ${scriptForMeasurement}`);
                expect(result).toBeGreaterThan(0);
                results['yocto-queue'] = result;
            },
            60000,
        );
        test.performance.concurrent.each([1, 2, 3, 4, 5, 6])(
            'Queue%d',
            async (n) => {
                const result = await measureLimit(/* js */ `
                    const Queue = require('./tests/performance/Queue${n}');
                    ${scriptForMeasurement}`);
                expect(result).toBeGreaterThan(0);
                results[`Queue${n}`] = result;
            },
            600000,
        );
        afterAll(() => {
            const valid = [
                'mine',
                'yocto-queue',
                'Queue1',
                'Queue2',
                'Queue3',
                'Queue4',
                'Queue5',
                'Queue6',
            ].filter((name) => name in results);
            if (valid.length) {
                console.log(
                    valid
                        .map((name) => {
                            return `${name.padStart(11)}: ${String(results[name]).padStart(10)}`;
                        })
                        .join('\n'),
                );
            }
        });
    });
    describe('performance', () => {
        jest.retryTimes(3, { logErrorsBeforeRetry: true });

        test.performance.each([100, 1000, 10000, 100000, 1000000])(
            'count: %d',
            async (count) => {
                // 交互に実行して最大値と最小値を除いた平均を取って比較
                const Queues = [
                    'Queue',
                    'yoctoQ',
                    'Queue1',
                    'Queue2',
                    'Queue3',
                    'Queue4',
                    'Queue5',
                    'Queue6',
                ] as const;
                const results = Object.fromEntries<number[]>(
                    Queues.map((n) => [n, []]),
                );
                const start = performance.now();
                LOOP: for (let repeat = 100; repeat-- > 0; ) {
                    const order = Queues.slice();
                    order.forEach((_, i) => {
                        const j = Math.floor(Math.random() * order.length);
                        if (i !== j) {
                            [order[i], order[j]] = [order[j], order[i]];
                        }
                    });
                    for (const n of order) {
                        results[n].push(await sample(n, count));
                        if (performance.now() - start > 20000) {
                            break LOOP;
                        }
                    }
                }
                const { Queue: mResult, ...others } = Object.fromEntries(
                    Queues.map((n) => [n, trimMean(...results[n])]),
                );
                console.log(
                    `count: ${count}\n Queue: ${mResult.toFixed(5).padStart(9)}\n${Object.entries(
                        others,
                    )
                        .map(
                            ([n, v]) =>
                                `${n}: ${v.toFixed(5).padStart(9)}(${((v / mResult) * 100).toFixed(3)}%)`,
                        )
                        .join('\n')}`,
                );
                // 1.5倍までは許容
                expect(mResult).toBeLessThan(others['yoctoQ'] * 1.5);
            },
            30000,
        );
    });
    test('blockSize', () => {
        const queue = Queue<number>(5);
        expect(queue.blockSize).toBe(5);
        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);
        queue.enqueue(4);
        queue.enqueue(5);
        queue.enqueue(6);
        expect(queue.size).toBe(6);
        queue.blockSize = 3;
        expect(queue.blockSize).toBe(3);
        queue.enqueue(7);
        queue.enqueue(8);
        queue.enqueue(9);
        expect(queue.size).toBe(9);
        expect([...queue]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
});

function sample(moduleName: string, count: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        const exec = spawn('node', [
            'tests/performance/measure.js',
            moduleName,
            String(count),
        ]);
        let buffer = '';
        exec.stdout.on('data', (chunk) => (buffer += String(chunk)));
        exec.stderr.on('data', (chunk) =>
            console.error(
                String(chunk).replace(/^(?=.)/gm, `${moduleName}:${count}: `),
            ),
        );
        exec.on('exit', (code, signal) => {
            if (signal) {
                reject(new Error(`signal received: ${signal}`));
                return;
            }
            if (code !== 0) {
                reject(new Error(`invalid status code: ${code}`));
                return;
            }
            // eslint-disable-next-line no-control-regex -- エスケープシーケンスに対応
            const elapsed = buffer.match(/(?<!\x1b\[\d*)\d+(?:\.\d+)?/)?.[0];
            if (!elapsed) {
                reject(new Error(`invalid output: ${buffer}`));
                return;
            }
            resolve(Number(elapsed));
        }).on('error', reject);
    });
}

function avarage(...numbers: number[]): number {
    return numbers.reduce((a, b) => a + b) / numbers.length;
}

function trimMean(...numbers: number[]): number {
    return avarage(
        ...(numbers.length > 4 ? numbers.sort().slice(1, -1) : numbers),
    );
}
