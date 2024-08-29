import { spawn } from 'child_process';
import { Queue } from '../src/Queue';
import wrappedImport from './wrappedImport';
import Queue1 from './performance/Queue1';
import Queue2 from './performance/Queue2';
import Queue3 from './performance/Queue3';
import Queue4 from './performance/Queue4';
import Queue5 from './performance/Queue5';

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
    ])('compatible %s', (_, Queue) => {
        const log: unknown[] = [];
        const queue = Queue<number>();
        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);
        expect([...queue]).toEqual([1, 2, 3]);
        log.push(queue.dequeue());
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
    test.performance.concurrent.each([100, 1000, 10000, 100000, 1000000])(
        'performance %d',
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
            ] as const;
            const results: Partial<Record<(typeof Queues)[number], number[]>> =
                {};
            for (let repeat = 100; repeat-- > 0; ) {
                await Promise.all(
                    Queues.map(async (n) => {
                        (results[n] ??= []).push(await sample(n, count));
                    }),
                );
            }
            const mResult = trimMean(...(results.Queue ?? [0]));
            const yResult = trimMean(...(results.yoctoQ ?? [0]));
            const q1Result = trimMean(...(results.Queue1 ?? [0]));
            const q2Result = trimMean(...(results.Queue2 ?? [0]));
            const q3Result = trimMean(...(results.Queue3 ?? [0]));
            const q4Result = trimMean(...(results.Queue4 ?? [0]));
            const q5Result = trimMean(...(results.Queue5 ?? [0]));
            console.log(
                `count: ${count}
                 Queue: ${mResult.toFixed(5).padStart(9)}
                 yocto: ${yResult.toFixed(5).padStart(9)}(${((yResult / mResult) * 100).toFixed(3)}%)
                Queue1: ${q1Result.toFixed(5).padStart(9)}(${((q1Result / mResult) * 100).toFixed(3)}%)
                Queue2: ${q2Result.toFixed(5).padStart(9)}(${((q2Result / mResult) * 100).toFixed(3)}%)
                Queue3: ${q3Result.toFixed(5).padStart(9)}(${((q3Result / mResult) * 100).toFixed(3)}%)
                Queue4: ${q4Result.toFixed(5).padStart(9)}(${((q4Result / mResult) * 100).toFixed(3)}%)
                Queue5: ${q5Result.toFixed(5).padStart(9)}(${((q5Result / mResult) * 100).toFixed(3)}%)
                `.replaceAll(
                    `
                `,
                    '\n',
                ),
            );
            // 1.5倍までは許容
            expect(mResult).toBeLessThan(yResult * 1.5);
        },
        60000,
    );
});

function sample(moduleName: string, count: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        const exec = spawn('node', [
            'tests/performance/measure.js',
            moduleName,
            String(count),
        ]);
        let code = '';
        exec.stdout.on('data', (chunk) => (code += String(chunk)));
        exec.on('exit', () => resolve(Number(code))).on('error', (err) =>
            reject(err),
        );
    });
}

function avarage(...numbers: number[]): number {
    return numbers.reduce((a, b) => a + b) / numbers.length;
}

function trimMean(...numbers: number[]): number {
    const max = Math.max(...numbers);
    const min = Math.min(...numbers);
    return avarage(...numbers.filter((e) => e !== max && e !== min));
}
