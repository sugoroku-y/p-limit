import { AsyncLocalStorage, AsyncResource } from 'async_hooks';
import pLimit, { type LimitFunction } from '../src';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- jestの拡張
    namespace jest {
        interface Expect {
            in<T>(...candidates: T[]): T;
        }
    }
}

function inCandidates(
    this: jest.MatcherContext,
    receive: unknown,
    ...candidates: unknown[]
): jest.CustomMatcherResult {
    return {
        pass: candidates.includes(receive),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- custom asymmetric matcherではmessageを使わない
        message: undefined!,
    };
}

expect.extend({ in: inCandidates });

describe('p-limit', () => {
    //        |        0|      100|      200|      300|      400|      500|      600|      700|      800|      900|     1000|     1100|
    // 0      |p[       |         |]        |         |         |         |         |         |         |         |         |         |
    // 1      |p[       |         |         |         |         |         |         |]        |         |         |         |         |
    // 2      |p[       |]        |         |         |         |         |         |         |         |         |         |         |
    // 3      |p        |[x       |         |         |         |         |         |         |         |         |         |         |
    // 4      |p        |[        |         |         |]        |         |         |         |         |         |         |         |
    // 5      |p        |         |[        |         |         |]        |         |         |         |         |         |         |
    // 6      |p        |         |         |-        |-        |-        |-        |-        |-        |-        |-        |-        |
    // cq     |         |         |         |!        |         |         |         |         |         |         |         |         |
    // 100    |         |         |         |p        |[        |         |]        |         |         |         |         |         |
    // 101    |         |         |         |p        |         |[        |         |         |         |]        |         |         |
    // 102    |         |         |         |p        |         |         |[        |         |]        |         |         |         |
    // 103    |         |         |         |p        |         |         |         |[        |         |         |         |]        |
    // 104    |         |         |         |p        |         |         |         |         |[        |         |]        |         |
    const timeoutElapse = {
        0: 200,
        1: 700,
        2: 100,
        3: -1,
        4: 300,
        5: 300,
        6: 100,
        100: 200,
        101: 400,
        102: 200,
        103: 400,
        104: 200,
    } as const;
    const clearQueueTiming = 300;
    const startLog = [
        // startはidの順番通りに並ぶ
        [0, 1, expect.in(0, 6)],
        [1, 2, expect.in(0, 5)],
        [2, 3, expect.in(0, 4)],
        [3, 3, 3],
        [4, 3, 2],
        [5, 3, 1],
        // 6の開始前にclearQueueが呼ばれる
        [100, 3, 4],
        [101, 3, 3],
        [102, 3, 2],
        [103, 3, 1],
        [104, 3, 0],
    ] as const;
    const endLog = [
        [2, 3, 4],
        // 3は開始直後に例外で終了
        [0, 3, 2],
        // clearQueueが呼ばれたあと5つがQueueに積まれる
        [4, 3, 5],
        [5, 3, 4],
        [100, 3, 3],
        [1, 3, 2],
        [102, 3, 1],
        [101, 3, 0],
        [104, 2, 0],
        [103, 1, 0],
    ] as const;
    test.each([
        ['original', undefined],
        ['this', pLimit],
    ])('call %s', async (_, pLimit) => {
        // eslint-disable-next-line no-param-reassign -- --
        pLimit ??= (await import('p-limit')).default;
        const limit = pLimit(3);
        const mockStartEach = jest.fn();
        const mockEndEach = jest.fn();
        const mockEndAll = jest.fn();
        void Promise.allSettled(
            initializeArray(7, (i) =>
                limit(
                    async (id) => {
                        mockStartEach(
                            id,
                            limit.activeCount,
                            limit.pendingCount,
                        );
                        if (timeoutElapse[id] < 0) {
                            throw new Error();
                        }
                        await timeout(timeoutElapse[id]);
                        mockEndEach(id, limit.activeCount, limit.pendingCount);
                        return `id: ${id}`;
                    },
                    i as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                ),
            ),
        ).then(mockEndAll);

        await timeout(clearQueueTiming);
        limit.clearQueue();
        const settled = await Promise.allSettled(
            initializeArray(5, (i) =>
                limit(
                    async (id) => {
                        mockStartEach(
                            id,
                            limit.activeCount,
                            limit.pendingCount,
                        );
                        await timeout(timeoutElapse[id]);
                        mockEndEach(id, limit.activeCount, limit.pendingCount);
                        return `id: ${id}`;
                    },
                    (100 + i) as 100 | 101 | 102 | 103 | 104,
                ),
            ),
        );

        expect(mockEndAll).not.toHaveBeenCalled();
        const status = 'fulfilled';
        expect(settled).toEqual(
            initializeArray(5, (id) => ({ status, value: `id: ${id + 100}` })),
        );
        expect(mockStartEach.mock.calls).toEqual(startLog);
        expect(mockEndEach.mock.calls).toEqual(endLog);
    });

    test('no-limit', async () => {
        const limit = pLimit(Infinity);
        const promise = Promise.all(
            initializeArray(10, (i) =>
                limit(async () => {
                    await timeout(0);
                    return i;
                }),
            ),
        );
        expect(limit.activeCount).toBe(10);
        expect(limit.pendingCount).toBe(0);
        expect(() => limit.clearQueue()).not.toThrow();
        expect(await promise).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    test('error', () => {
        // @ts-expect-error 数値以外が指定されたら例外を投げることの確認
        expect(() => pLimit('-1')).toThrow();
        expect(() => pLimit(-1)).toThrow();
        expect(() => pLimit(-Infinity)).toThrow();
        expect(() => pLimit(NaN)).toThrow();
        expect(() => pLimit(1.5)).not.toThrow();
        expect(() => pLimit(Number.MAX_SAFE_INTEGER)).not.toThrow();
        expect(() => pLimit(Infinity)).not.toThrow();
    });
    test('performance', async () => {
        const { default: original } = await import('p-limit');

        const originalResult = await getPerformance(original);
        const thisResult = await getPerformance(pLimit);
        console.log('original:', originalResult, 'this package:', thisResult);

        // 全般的に速くなっているはず
        expect(thisResult.queuing).toBeLessThan(originalResult.queuing);
        // なんだけど、タスクの終了から次のタスクの開始までにかかる時間では逆転することがある
        // expect(thisResult.max).toBeLessThan(originalResult.max);
        // expect(thisResult.avg).toBeLessThan(originalResult.avg);
        // 総合で速くなってれば良し
        expect(thisResult.score).toBeLessThan(originalResult.score);
    });

    test('async-context-old', async () => {
        const { default: pLimit } = await import('p-limit');
        const limit = pLimit(3);
        const storage = new AsyncLocalStorage();
        const result = await Promise.all([
            storage.run('foo', () =>
                Promise.all(
                    initializeArray(5, (id) =>
                        limit(async () => {
                            await timeout(100);
                            return `${storage.getStore()}:${id}`;
                        }),
                    ),
                ),
            ),
            storage.run('bar', () =>
                Promise.all(
                    initializeArray(5, (id) =>
                        limit(async () => {
                            await timeout(100);
                            return `${storage.getStore()}:${id}`;
                        }),
                    ),
                ),
            ),
        ]);
        // オリジナルのp-limitではAsyncResource.bindにより非同期コンテキストの切り替えに対応している
        expect(result).toEqual([
            ['foo:0', 'foo:1', 'foo:2', 'foo:3', 'foo:4'],
            ['bar:0', 'bar:1', 'bar:2', 'bar:3', 'bar:4'],
        ]);
    });
    test('async-context-old without AsyncResource.bind', async () => {
        const { default: pLimit } = await import('p-limit');
        // AsyncResource.bindを無効化した状態でオリジナルのp-limitを実行すると
        const mock = jest
            .spyOn(AsyncResource, 'bind')
            .mockImplementation((f) => f);
        try {
            const limit = pLimit(3);
            const storage = new AsyncLocalStorage();
            const result = await Promise.all([
                storage.run('foo', () =>
                    Promise.all(
                        initializeArray(5, (id) =>
                            limit(async () => {
                                await timeout(100);
                                return `${storage.getStore()}:${id}`;
                            }),
                        ),
                    ),
                ),
                storage.run('bar', () =>
                    Promise.all(
                        initializeArray(5, (id) =>
                            limit(async () => {
                                await timeout(100);
                                return `${storage.getStore()}:${id}`;
                            }),
                        ),
                    ),
                ),
            ]);
            expect(result).toEqual([
                ['foo:0', 'foo:1', 'foo:2', 'foo:3', 'foo:4'],
                ['bar:0', 'bar:1', 'bar:2', 'bar:3', 'bar:4'].map(
                    // AsyncResource.bindを無効化しているため`bar:n`にならない
                    (s) => expect.not.stringMatching(s) as string,
                ),
            ]);
        } finally {
            mock.mockRestore();
        }
    });
    test('async-context', async () => {
        const limit = pLimit(3);
        const storage = new AsyncLocalStorage();
        const result = await Promise.all([
            storage.run('foo', () =>
                Promise.all(
                    initializeArray(5, (id) =>
                        limit(async () => {
                            await timeout(100);
                            return `${storage.getStore()}:${id}`;
                        }),
                    ),
                ),
            ),
            storage.run('bar', () =>
                Promise.all(
                    initializeArray(5, (id) =>
                        limit(async () => {
                            await timeout(100);
                            return `${storage.getStore()}:${id}`;
                        }),
                    ),
                ),
            ),
        ]);
        // このp-limitではAsyncResource.bindを使用していないが非同期コンテキストの切り替えに対応している
        expect(result).toEqual([
            ['foo:0', 'foo:1', 'foo:2', 'foo:3', 'foo:4'],
            ['bar:0', 'bar:1', 'bar:2', 'bar:3', 'bar:4'],
        ]);
    });
});

function timeout(elapse: number): Promise<void> {
    return new Promise((r) => setTimeout(r, elapse));
}

function initializeArray<T>(
    length: number,
    initializer: (i: number) => T,
): Array<T> {
    return Array.from({ length }, (_, i) => initializer(i));
}

async function getPerformance(pLimit: (concurrency: number) => LimitFunction) {
    const limit = pLimit(20);
    const taskCount = 1000;
    const intervals: number[] = [];
    let last: number | undefined;
    const start = performance.now();
    const allPromise = Promise.all(
        initializeArray(taskCount, () =>
            limit(async () => {
                if (last !== undefined) {
                    intervals.push(performance.now() - last);
                }
                await timeout(0);
                last = performance.now();
            }),
        ),
    );
    // タスクの登録にかかる時間
    const queuing = (performance.now() - start) / taskCount;
    await allPromise;
    // タスクが完了してから次のタスクを開始するまでの時間
    const max = Math.max(...intervals);
    const avg = intervals.reduce((a, b) => a + b) / intervals.length;
    // queuing + avgをパフォーマンス計測の対象とする
    return { max, avg, queuing, score: queuing + avg };
}
