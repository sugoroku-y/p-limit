import pLimit, { type LimitFunction } from '../src';

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
        [0, 1, 6],
        [1, 2, 5],
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
