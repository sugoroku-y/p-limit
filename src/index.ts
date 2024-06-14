import { Queue } from './Queue';

/** `limit`関数 */
export interface LimitFunction {
    /**
     * タスクをpLimitで指定された並列実行最大数に制限して実行します。
     * @template Parameters タスクに渡される引数の型です。
     * @template ReturnType タスクが返す返値の型です。
     * @param task 実行するタスクを指定します。
     * @param parameters タスクに渡される引数を指定します。
     * @returns タスクの実行が完了したらタスクの返値を返すPromiseを返します。
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

/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrency 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
export default function pLimit(concurrency: number) {
    // 引数のチェック
    if (!(typeof concurrency === 'number' && concurrency >= 1)) {
        throw new TypeError(
            'Expected `concurrency` to be a number from 1 and up',
        );
    }
    // 実行中のタスクの数
    let activeCount = 0;
    // 待機中のタスク
    const pending = Queue<() => void>();
    const limit: FunctionType<LimitFunction> = async (task, ...parameters) => {
        let timing;
        if (activeCount >= concurrency) {
            // 余裕がなければ待機
            // eslint-disable-next-line @typescript-eslint/unbound-method -- Queueはthisを使っていない
            await new Promise<void>(pending.enqueue);
        } else {
            // 余裕がある場合でもactiveCountを増やしてからちょっとだけ待つ
            timing = Promise.resolve();
        }
        // タスクが実行中にactiveCountが1つだけ増えるように
        ++activeCount;
        try {
            await timing;
            return await task(...parameters);
        } finally {
            --activeCount;
            // activeCountが減って余裕ができたので、次のタスクの待機を解除する
            pending.dequeue()?.();
        }
    };
    // 各プロパティ/メソッドの用意
    return Object.defineProperties(limit, {
        activeCount: { get: () => activeCount },
        pendingCount: { get: () => pending.size },
        clearQueue: { value: () => pending.clear() },
    } satisfies Descriptors<LimitFunction>) as LimitFunction;
}
