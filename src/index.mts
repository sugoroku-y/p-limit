/** `limit`関数 */
export interface LimitFunction {
    /**
     * タスクをpLimitで指定された並列実行最大数に制限して実行します。
     * @template Parameters タスクに渡される引数の型です。
     * @template ReturnType タスクが返す返値の型です。
     * @param task 実行するタスクを指定します。
     * @param parameters タスクに渡される引数を指定します。
     * @returns タスクの実行が完了したらカスクの返値を返すPromiseを返します。
     */
    <Parameters extends unknown[], ReturnType>(
        task: (...parameters: Parameters) => PromiseLike<ReturnType>,
        ...parameters: Parameters
    ): Promise<ReturnType>;

    /** 現在同時実行中のタスクの数 */
    readonly activeCount: number;
    /** 現在実行待機中のタスクの数 */
    readonly pendingCount: number;
    /**
     * 現在実行待機中のタスクをクリアして実行開始しないようにします。
     *
     * すでに実行開始済のタスクには何もしません。
     */
    clearQueue(): void;
}

type FunctionType<T> = T extends (
    ...parameters: infer Parameters
) => infer ReturnType
    ? (...parameters: Parameters) => ReturnType
    : never;

type Descriptors<T extends object> = {
    [Key in keyof T]: TypedPropertyDescriptor<T[Key]>;
};

const squash = () => {};
const neverResolved = new Promise<never>(squash);

const cache: Array<() => number> = [];
function returnIndex(index: number): () => number {
    return (cache[index] ??= () => index);
}

/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param maxWorkers 並列実行する最大数を指定します。
 *
 * 正の整数値、もしくは`Infinity`を指定できます。
 *
 * ただし、 $2^32$ 以上を指定した場合、並列実行数の制限を行いません。
 * @returns 生成した`limit`関数を返します。
 * @throws maxWorkersに不正な値(`Infinity`と正の整数以外)を指定したときに例外を投げます。
 */
export default function pLimit(maxWorkers: number): LimitFunction {
    if (
        !(
            maxWorkers === Infinity ||
            (Number.isInteger(maxWorkers) && maxWorkers > 0)
        )
    ) {
        throw new TypeError(
            'Expected `maxWorkers` to be a number from 1 and up',
        );
    }
    if (maxWorkers >= 2 ** 32) {
        // 2^32以上は配列を生成できないので同時実行数を制限しない
        return noLimit();
    }
    return nLimit(maxWorkers);
}

class ActiveCounter {
    count = 0;
    activate = async <P extends unknown[], R>(
        f: (...p: P) => PromiseLike<R>,
        ...p: P
    ): Promise<R> => {
        ++this.count;
        try {
            return await f(...p);
        } finally {
            --this.count;
        }
    };
    getter = () => this.count;
}

function noLimit() {
    // activeCountの管理だけ行う
    const activeCount = new ActiveCounter();
    return Object.defineProperties(activeCount.activate, {
        // 待機中のタスクは常になし
        pendingCount: { get: returnIndex(0) },
        // activeCountは管理しているものを返す
        activeCount: { get: activeCount.getter },
        // 待機中のタスクが常にないのでclearQueueでも何もしない
        clearQueue: { value: squash },
    } satisfies Descriptors<LimitFunction>) as LimitFunction;
}

function nLimit(length: number) {
    // 指定された数だけ枠を用意しておく
    const slots = Array.from({ length }, (_, i) => Promise.resolve(i));
    // 空き枠の検索結果を保持するPromise
    let nextIndex = Promise.resolve(NaN);
    let context = {
        pendingCount: 0,
    };
    const activeCount = new ActiveCounter();
    const limit: FunctionType<LimitFunction> = async (task, ...parameters) => {
        const current = context;
        ++current.pendingCount;
        // 一つ前のタスクでの検索が終わってから、このタスクでの検索を開始する
        nextIndex = nextIndex.then(() => Promise.race(slots));
        // 空き枠の検索
        const index = await nextIndex;
        if (current !== context) {
            // contextがリセットされたら古いcontextで始まったtaskは開始しない
            return neverResolved;
        }
        --current.pendingCount;
        return activeCount.activate(() => {
            // タスクを開始
            const promise = task(...parameters);
            // このtaskが完了したらindexを返すPromiseに差し替える
            slots[index] = Promise.resolve(promise)
                .catch(squash)
                .then(returnIndex(index));
            // taskの返値をそのまま返す
            return promise;
        });
    };
    return Object.defineProperties(limit, {
        activeCount: { get: activeCount.getter },
        pendingCount: { get: () => context.pendingCount },
        clearQueue: {
            value: () => {
                // contextをリセット
                context = { pendingCount: 0 };
            },
        },
    } satisfies Descriptors<LimitFunction>) as LimitFunction;
}
