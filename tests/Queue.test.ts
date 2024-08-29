import { Queue } from '../src/Queue';
import wrappedImport from './wrappedImport';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- ts-jestで実行時にはエラーにならないので@ts-ignoreを使う
// @ts-ignore 型としてのimportなのでCommonJSかESModuleかは関係ない
const YoctoQueue = wrappedImport<typeof import('yocto-queue')>('yocto-queue');

describe('Queue', () => {
    test.each([
        ['yocto-queue', YoctoQueue],
        ['mime', Promise.resolve({ default: Queue })],
    ])('compatible %s', async (_, m) => {
        const { default: Queue } = await m;
        const log: unknown[] = [];
        const queue = new (Queue as new () => Queue<number>)();
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
    test('method yocto-queue', async () => {
        const { default: Queue } = await YoctoQueue;
        const queue = new Queue<number>();
        // eslint-disable-next-line @typescript-eslint/unbound-method -- -
        expect(() => (0, queue.enqueue)(1)).toThrow();
    });
    test.performance.concurrent.each([100, 1000, 10000, 100000, 1000000])(
        'performance %d',
        async (count) => {
            function sample(Queue: () => Queue<number>, count: number): number {
                const queue = Queue();
                const start = performance.now();
                for (let c = count; c; --c) {
                    queue.enqueue(c);
                }
                while (queue.dequeue());
                return performance.now() - start;
            }
            function avarage(...numbers: number[]): number {
                return numbers.reduce((a, b) => a + b) / numbers.length;
            }
            const mine = Queue;
            const yQueue = (await YoctoQueue).default;
            const yocto = () => new yQueue<number>();
            // 交互に実行して最大値と最小値を除いた平均を取って比較
            const results = [
                ['m', sample(mine, count)],
                ['y', sample(yocto, count)],
                ['m', sample(mine, count)],
                ['y', sample(yocto, count)],
                ['m', sample(mine, count)],
                ['y', sample(yocto, count)],
                ['m', sample(mine, count)],
                ['y', sample(yocto, count)],
                ['m', sample(mine, count)],
                ['y', sample(yocto, count)],
                ['m', sample(mine, count)],
                ['y', sample(yocto, count)],
            ] as const;
            const mResults = results
                .filter(([n]) => n === 'm')
                .map(([, v]) => v);
            const mResultMax = Math.max(...mResults);
            const mResultMin = Math.min(...mResults);
            const yResults = results
                .filter(([n]) => n === 'y')
                .map(([, v]) => v);
            const yResultMax = Math.max(...yResults);
            const yResultMin = Math.min(...yResults);
            const mResult = avarage(
                ...mResults.filter((e) => e !== mResultMax && e !== mResultMin),
            );
            const yResult = avarage(
                ...yResults.filter((e) => e !== yResultMax && e !== yResultMin),
            );
            console.log(
                `count: ${count}
                mResult: ${mResult}
                yResult: ${yResult}
                mResult / yResult: ${mResult / yResult}
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
