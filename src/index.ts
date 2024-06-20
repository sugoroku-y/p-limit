import { Queue } from './Queue';

interface LimitFunctionBase {
    /**
     * タスクをpLimitで指定された並列実行最大数に制限して実行します。
     * @template Parameters タスクに渡される引数の型です。
     * @template ReturnType タスクが返す返値の型です。
     * @param task 実行するタスクを指定します。
     * @param parameters タスクに渡される引数を指定します。
     * @returns タスクの実行が完了したらタスクの返値を返すPromiseを返します。
     */
    <Parameters extends unknown[], ReturnType>(
        task: (...parameters: Parameters) => ReturnType,
        ...parameters: Parameters
    ): Promise<Awaited<ReturnType>>;
}

/** `limit`関数 */
export interface LimitFunction extends LimitFunctionBase {
    /** 現在同時実行中のタスクの数 */
    readonly activeCount: number;
    /** 現在実行待機中のタスクの数 */
    readonly pendingCount: number;
    /**
     * 同時実行数の最大値。
     *
     * より大きい数値に変更すると、待機中のタスクから追加で実行開始します。
     *
     * より小さい数値に変更した場合は何もしません。
     */
    concurrency: number;
    /**
     * 現在実行待機中のタスクをクリアして実行開始しないようにします。
     *
     * すでに実行開始済のタスクには何もしません。
     */
    clearQueue(): void;
}

/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrencySpec 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
export default function pLimit(concurrencySpec: number): LimitFunction {
    validation(concurrencySpec);

    /** 並列実行する最大数 */
    let concurrency = concurrencySpec;
    /** 実行中のタスクの数 */
    let activeCount = 0;
    /** 待機中のタスク */
    const queue = Queue<() => void>();
    /** 即時実行するためのPromiseチェーン */
    let starter = Promise.resolve();

    return Object.defineProperties(
        (async (task, ...parameters) => {
            // 待機状態で開始
            await pending();
            ++activeCount;
            try {
                // eslint-disable-next-line @typescript-eslint/await-thenable -- taskは通常Promiseを返すので問題ない
                return await task(...parameters);
            } finally {
                --activeCount;
                if (activeCount < concurrency) {
                    // activeCountが減って余裕ができれば、次のタスクの待機を解除する
                    resumeNext();
                }
            }
        }) as LimitFunctionBase,
        {
            activeCount: { get: () => activeCount },
            pendingCount: { get: () => queue.size },
            clearQueue: { value: queue.clear },
            concurrency: {
                get: () => concurrency,
                set: setConcurrency,
            },
        } satisfies TypedPropertyDescriptors<LimitFunction>,
    );

    /**
     * 外部に公開するAPIの引数が適切なものかチェックして、不適切であれば例外を投げます。
     * @static
     * @param concurrency 並列実行する最大数を指定します。
     * @memberof LimitExecutor
     * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
     */
    function validation(concurrency: number) {
        // 引数のチェック
        if (typeof concurrency === 'number' && concurrency >= 1) {
            return;
        }
        throw new TypeError(
            'Expected `concurrency` to be a number from 1 and up',
        );
    }
    /**
     * pendingで生成されたPromiseの待機状態を解除します。
     * @private
     * @memberof LimitExecutor
     */
    function resumeNext() {
        queue.dequeue()?.();
    }
    /**
     * 待機状態のPromiseを返します。
     * @private
     * @returns 待機状態のPromise
     * @memberof LimitExecutor
     */
    function pending() {
        // 余裕があれば待機を解除する処理を予約しておきます。
        starter = starter.then(() => {
            if (activeCount < concurrency) {
                resumeNext();
            }
        });
        // 待機状態にします
        return new Promise<void>(queue.enqueue);
    }
    /**
     * 同時実行数の最大値を設定します。
     *
     * より大きい数値に変更すると、待機中のタスクから追加で実行開始します。
     *
     * より小さい数値に変更した場合は何もしません。
     * @param newConcurrency 同時実行数の最大値。
     */
    function setConcurrency(newConcurrency: number) {
        validation(newConcurrency);
        concurrency = newConcurrency;
        // 増えた分だけ待機解除
        let count = concurrency - activeCount;
        while (count-- > 0) {
            resumeNext();
        }
    }
}
