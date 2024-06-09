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
    activeCount: number;
    /** 現在実行待機中のタスクの数 */
    pendingCount: number;
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
/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param maxWorkers 並列実行する最大数を指定します。
 * @returns 生成した`limit`関数を返します。
 */
export default function pLimit(maxWorkers: number): LimitFunction {
    // 指定された数だけ枠を用意しておく
    const slots = Array.from({ length: maxWorkers }, (_, i) =>
        Promise.resolve(i),
    );
    // 空き枠の検索結果を保持するPromise
    let nextIndex = Promise.resolve(NaN);
    let context = {
        pendingCount: 0,
    };
    let activeCount = 0;
    const limit: FunctionType<LimitFunction> = async (task, ...parameters) => {
        const current = context;
        ++current.pendingCount;
        // 一つ前のタスクでの検索が終わってから、このタスクでの検索を開始する
        nextIndex = nextIndex.then(() => Promise.race(slots));
        // 空き枠の検索
        const index = await nextIndex;
        if (current !== context) {
            // contextがリセットされたら古いcontextで始まったtaskは開始しない
            await new Promise(() => {});
        }
        --current.pendingCount;
        ++activeCount;
        // タスクを開始
        const promise = task(...parameters);
        // このtaskが完了したらindexを返すPromiseに差し替える
        slots[index] = Promise.resolve(promise)
            .catch(() => {})
            .then(() => {
                --activeCount;
                return index;
            });
        // taskの返値をそのまま返す
        return promise;
    };
    return Object.defineProperties(limit, {
        activeCount: { get: () => activeCount },
        pendingCount: { get: () => context.pendingCount },
        clearQueue: {
            value: () => {
                // contextをリセット
                context = { pendingCount: 0 };
            },
        },
    } satisfies Descriptors<LimitFunction>) as LimitFunction;
}
