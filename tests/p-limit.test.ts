import { AsyncLocalStorage } from 'async_hooks';
import pLimit, { type LimitFunction } from '../src';
import wrappedImport from './wrappedImport';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- ts-jestで実行時にはエラーにならないので@ts-ignoreを使う
// @ts-ignore 型としてのimportなのでCommonJSかESModuleかは関係ない
const pLimitOriginal = wrappedImport<typeof import('p-limit')>('p-limit');

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
        [0, 3, 4],
        [1, 3, 4],
        [2, 3, 4],
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

    describe.each([
        ['original', pLimitOriginal],
        ['this', Promise.resolve({ default: pLimit })],
    ])('compatibility %s', (_, pLimitPromise) => {
        let pLimit: (concurrency: number) => LimitFunction;
        beforeAll(async () => {
            pLimit = (await pLimitPromise).default as typeof pLimit;
        });
        test('call', async () => {
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
                            mockEndEach(
                                id,
                                limit.activeCount,
                                limit.pendingCount,
                            );
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
                            mockEndEach(
                                id,
                                limit.activeCount,
                                limit.pendingCount,
                            );
                            return `id: ${id}`;
                        },
                        (100 + i) as 100 | 101 | 102 | 103 | 104,
                    ),
                ),
            );

            expect(mockEndAll).not.toHaveBeenCalled();
            const status = 'fulfilled';
            expect(settled).toEqual(
                initializeArray(5, (id) => ({
                    status,
                    value: `id: ${id + 100}`,
                })),
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
            expect(limit.activeCount).toBe(0);
            expect(limit.pendingCount).toBe(10);
            await timeout(0);
            expect(limit.activeCount).toBe(10);
            expect(limit.pendingCount).toBe(0);
            expect(() => limit.clearQueue()).not.toThrow();
            expect(await promise).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
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
    test.performance.concurrent('performance', async () => {
        const { default: original } = await pLimitOriginal;

        const originalResult = await getPerformance(original as typeof pLimit);
        const thisResult = await getPerformance(pLimit);
        console.log('original:', originalResult, 'this package:', thisResult);

        // どちらも結果が返っていれば良しとする
        expect(Object.keys(thisResult)).toEqual(Object.keys(originalResult));
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

    describe('original test', () => {
        test('concurrency: 1', async () => {
            const input = [
                [10, 300],
                [20, 200],
                [30, 100],
            ] as const;

            const start = performance.now();
            const limit = pLimit(1);

            const mapper = ([value, ms]: readonly [number, number]) =>
                limit(async () => {
                    await timeout(ms);
                    return value;
                });

            expect(await Promise.all(input.map((x) => mapper(x)))).toEqual([
                10, 20, 30,
            ]);
            const elapse = performance.now() - start;
            expect(elapse).toBeGreaterThan(590);
            expect(elapse).toBeLessThan(650);
        });

        test('concurrency: 4', async () => {
            const concurrency = 5;
            let running = 0;

            const limit = pLimit(concurrency);

            const input = initializeArray(100, () =>
                limit(async () => {
                    running++;
                    const current = running;
                    await timeout(Math.floor(30 + 170 * Math.random()));
                    running--;
                    return current;
                }),
            );
            const result = await Promise.all(input);
            expect(
                result.every((r) => 1 <= r && r <= concurrency),
            ).toBeTruthy();
        });

        test('propagates async execution context properly', async () => {
            const concurrency = 2;
            const limit = pLimit(concurrency);
            const store = new AsyncLocalStorage<number>();

            const checkId = async () => {
                await Promise.resolve();
                return store.getStore();
            };

            const startContext = async (id: number) =>
                store.run(id, () => limit(checkId));

            const result = await Promise.all(
                initializeArray(100, (id) => startContext(id)),
            );
            expect(result).toEqual(initializeArray(100, (id) => id));
        });

        test('non-promise returning function', async () => {
            const limit = pLimit(1);
            const result = await limit(() => null);
            expect(result).toBeNull();
        });

        test('continues after sync throw', async () => {
            const limit = pLimit(1);
            let ran = false;

            const promises = [
                limit(() => {
                    throw new Error('err');
                }),
                limit(() => {
                    ran = true;
                }),
            ];

            await Promise.all(promises).catch(() => {});

            expect(ran).toBeTruthy();
        });

        test('accepts additional arguments', async () => {
            const limit = pLimit(1);
            const symbol = Symbol('test');

            const result = await limit(async (a) => Promise.resolve(a), symbol);
            expect(result).toBe(symbol);
        });

        test('does not ignore errors', async () => {
            const limit = pLimit(1);
            const error = new Error('🦄');

            const promises = [
                limit(async () => {
                    await timeout(30);
                }),
                limit(async () => {
                    await timeout(80);
                    throw error;
                }),
                limit(async () => {
                    await timeout(50);
                }),
            ];

            await expect(Promise.all(promises)).rejects.toThrow(error);
        });

        test('activeCount and pendingCount properties', async () => {
            const limit = pLimit(5);
            expect(limit.activeCount).toBe(0);
            expect(limit.pendingCount).toBe(0);

            const runningPromise1 = limit(() => timeout(1000));
            expect(limit.activeCount).toBe(0);
            expect(limit.pendingCount).toBe(1);

            await timeout(0);
            expect(limit.activeCount).toBe(1);
            expect(limit.pendingCount).toBe(0);

            await runningPromise1;
            expect(limit.activeCount).toBe(0);
            expect(limit.pendingCount).toBe(0);

            const immediatePromises = initializeArray(5, () =>
                limit(() => timeout(1000)),
            );
            const delayedPromises = initializeArray(3, () =>
                limit(() => timeout(1000)),
            );

            await timeout(0);
            expect(limit.activeCount).toBe(5);
            expect(limit.pendingCount).toBe(3);

            await Promise.all(immediatePromises);
            expect(limit.activeCount).toBe(3);
            expect(limit.pendingCount).toBe(0);

            await Promise.all(delayedPromises);

            expect(limit.activeCount).toBe(0);
            expect(limit.pendingCount).toBe(0);
        });

        test('clearQueue', async () => {
            const limit = pLimit(1);

            const promise = limit(() => timeout(1000));
            void initializeArray(3, () => limit(() => timeout(1000)));

            await timeout(0);
            expect(limit.pendingCount).toBe(3);
            limit.clearQueue();
            expect(limit.pendingCount).toBe(0);
            expect(limit.activeCount).toBe(1);
            await promise;
            expect(limit.activeCount).toBe(0);
        });

        test('throws on invalid concurrency argument', () => {
            expect(() => {
                pLimit(0);
            }).toThrow();

            expect(() => {
                pLimit(-1);
            }).toThrow();

            expect(() => {
                pLimit(1.2);
            }).not.toThrow(); // p-limitとは違い許容する

            expect(() => {
                // @ts-expect-error 型が不一致でも仕様どおりになることを確認
                pLimit(undefined);
            }).toThrow();

            expect(() => {
                // @ts-expect-error 型が不一致でも仕様どおりになることを確認
                pLimit(true);
            }).toThrow();
        });

        test('change concurrency to smaller value', async () => {
            const limit = pLimit(4);
            expect(limit.concurrency).toBe(4);
            let running = 0;
            const log: number[] = [];
            const promises = initializeArray(10, () =>
                limit(async () => {
                    ++running;
                    log.push(running);
                    await timeout(50);
                    --running;
                }),
            );
            await timeout(0);
            expect(running).toBe(4);

            limit.concurrency = 2;
            expect(limit.concurrency).toBe(2);
            await Promise.all(promises);
            expect(log).toEqual([1, 2, 3, 4, 2, 2, 2, 2, 2, 2]);
        });

        test('change concurrency to bigger value', async () => {
            const limit = pLimit(2);
            expect(limit.concurrency).toBe(2);
            let running = 0;
            const log: number[] = [];
            const promises = initializeArray(10, () =>
                limit(async () => {
                    ++running;
                    log.push(running);
                    await timeout(50);
                    --running;
                }),
            );
            await timeout(0);
            expect(running).toBe(2);

            limit.concurrency = 4;
            expect(limit.concurrency).toBe(4);
            await Promise.all(promises);
            expect(log).toEqual([1, 2, 3, 4, 4, 4, 4, 4, 4, 4]);
        });
    });
    describe('writable & readonly', () => {
        const limit: Writable<LimitFunction> = pLimit(3);
        test('activeCount', () => {
            expect(() => {
                limit.activeCount = 1;
            }).toThrow();
            expect(limit.activeCount).toBe(0);
        });
        test('pendingCount', () => {
            expect(() => {
                limit.pendingCount = 1;
            }).toThrow();
            expect(limit.pendingCount).toBe(0);
        });
        test('clearQueue', () => {
            const dummy = () => {};
            limit.clearQueue = dummy;
            expect(limit.clearQueue).toBe(dummy);
        });
        test('concurrency', () => {
            limit.concurrency = 5;
            expect(limit.concurrency).toBe(5);
        });
    });
    describe('promise like', () => {
        test('onfulfilled with one parameter', async () => {
            const limit = pLimit(1);
            await expect(
                Promise.race([
                    limit(() => ({
                        then(f: (v: number) => void) {
                            f(1);
                        },
                    })),
                    timeout(0).then(() =>
                        Promise.reject(new Error('never finished')),
                    ),
                ]),
            ).resolves.toBe(1);
        });
        test('onfulfilled with two parameters', async () => {
            const limit = pLimit(1);
            await expect(
                Promise.race([
                    limit(() => ({
                        then(f: (v: number, _: unknown) => void) {
                            f(1, {});
                        },
                    })),
                    timeout(0).then(() =>
                        Promise.reject(new Error('never finished')),
                    ),
                ]),
            ).resolves.toBe(1);
        });
        test('onfulfilled without parameter', async () => {
            const limit = pLimit(1);
            await expect(
                Promise.race([
                    limit(() => ({
                        then(f: () => void) {
                            f();
                        },
                    })),
                    timeout(0).then(() =>
                        Promise.reject(new Error('never finished')),
                    ),
                ]),
            ).resolves.toBeUndefined();
        });
        test('then with three parameters', async () => {
            const limit = pLimit(1);
            await expect(
                Promise.race([
                    limit(() => ({
                        then(f: (v: number) => void, _2: unknown, _3: unknown) {
                            f(1);
                        },
                    })),
                    timeout(0).then(() =>
                        Promise.reject(new Error('never finished')),
                    ),
                ]),
            ).resolves.toBe(1);
        });
        test('then with non-function', async () => {
            const limit = pLimit(1);
            await expect(
                Promise.race([
                    limit(() => ({
                        then(f: unknown) {
                            f;
                        },
                    })),
                    timeout(0).then(() =>
                        Promise.reject(new Error('never finished')),
                    ),
                ]),
            ).rejects.toThrow('never finished');
        });
        test('then is non-function', async () => {
            const limit = pLimit(1);
            await expect(
                Promise.race([
                    limit(() => ({ then: 1 })),
                    timeout(0).then(() =>
                        Promise.reject(new Error('never finished')),
                    ),
                ]),
            ).resolves.toEqual({ then: 1 });
        });
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
    let last: number | undefined;
    const start = performance.now();
    const promises = initializeArray(taskCount, () =>
        limit(async () => {
            const lap = last !== undefined ? performance.now() - last : NaN;
            await timeout(0);
            last = performance.now();
            return lap;
        }),
    );
    // タスクの登録にかかる時間
    const queuing = (performance.now() - start) / taskCount;
    const intervals = (await Promise.all(promises)).filter((e) => !isNaN(e));
    // タスクが完了してから次のタスクを開始するまでの時間
    const max = Math.max(...intervals);
    const avg = intervals.reduce((a, b) => a + b) / intervals.length;
    // queuing + avgをパフォーマンス計測の対象とする
    return { max, avg, queuing, score: queuing + avg };
}

type Writable<T> = { -readonly [K in keyof T]: T[K] };
