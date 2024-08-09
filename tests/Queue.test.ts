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
});
