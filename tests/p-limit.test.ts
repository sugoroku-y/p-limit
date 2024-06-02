import pLimit from '../src';

describe('p-limit', () => {
    const timeoutElapse = {
        0: 800,
        1: 200,
        2: 600,
        3: 500,
        4: 600,
        5: 400,
        6: 100,
        100: 400,
        101: 200,
        102: 500,
        103: 200,
        104: 200,
    } as const;
    test('call', async () => {
        const limit = pLimit(3);
        const mockStartEach = jest.fn();
        const mockEndEach = jest.fn();
        const mockEndAll = jest.fn();
        const errorOccurred = 3;
        void Promise.allSettled(
            initializeArray(7, (i) =>
                limit(
                    async (id) => {
                        mockStartEach(
                            id,
                            limit.activeCount,
                            limit.pendingCount,
                        );
                        if (id === errorOccurred) {
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

        await timeout(600);
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
        expect(mockStartEach.mock.calls).toEqual([
            [0, 1, 6],
            [1, 2, 5],
            [2, 3, 4],
            [3, 3, 3],
            [4, 3, 2],
            [100, 3, 4],
            [101, 3, 3],
            [102, 3, 2],
            [103, 3, 1],
            [104, 3, 0],
        ]);
        expect(mockEndEach.mock.calls).toEqual([
            [expect.range({ min: 0, max: 2 }), 3, 4],
            [expect.range({ min: 0, max: 2 }), 3, 5],
            [expect.range({ min: 0, max: 2 }), 3, 4],
            [4, 3, 3],
            [expect.range({ min: 100, max: 104 }), 3, 2],
            [expect.range({ min: 100, max: 104 }), 3, 1],
            [expect.range({ min: 100, max: 104 }), 3, 0],
            [expect.range({ min: 100, max: 104 }), 2, 0],
            [expect.range({ min: 100, max: 104 }), 1, 0],
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

type MinimumSpec = { min: number } | { minExclusive: number };
type MaximumSpec = { max: number } | { maxExclusive: number };

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- jestの拡張
    namespace jest {
        interface Expect {
            range(
                spec: MinimumSpec | MaximumSpec | (MinimumSpec & MaximumSpec),
            ): number;
        }
    }
}

function range(
    this: jest.MatcherContext,
    receive: unknown,
    spec: object,
): jest.CustomMatcherResult {
    if (typeof receive !== 'number') {
        throw new Error(`unsupported type: ${typeof receive}`);
    }
    if (
        typeof spec !== 'object' ||
        spec === null ||
        !(
            ('min' in spec && typeof spec.min === 'number') ||
            ('minExclusive' in spec && typeof spec.minExclusive === 'number') ||
            ('max' in spec && typeof spec.max === 'number') ||
            ('maxExclusive' in spec && typeof spec.maxExclusive === 'number')
        )
    ) {
        throw new Error(`spec is not range: ${JSON.stringify(spec)}`);
    }
    return {
        pass:
            ('min' in spec && typeof spec.min === 'number'
                ? receive >= spec.min
                : true) &&
            ('minExclusive' in spec && typeof spec.minExclusive === 'number'
                ? receive > spec.minExclusive
                : true) &&
            ('max' in spec && typeof spec.max === 'number'
                ? receive <= spec.max
                : true) &&
            ('maxExclusive' in spec && typeof spec.maxExclusive === 'number'
                ? receive < spec.maxExclusive
                : true),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- asymmetric matcherではmessageを使用しない
        message: undefined!,
    };
}

expect.extend({ range });
