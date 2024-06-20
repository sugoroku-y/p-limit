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

type TypedPropertyDescriptors<T extends object> = {
    [Key in keyof T]: TypedPropertyDescriptor<T[Key]>;
};

class LimitExecutor {
    /** 実行中のタスクの数 */
    private activeCount = 0;
    /** 待機中のタスク */
    private readonly queue = Queue<() => void>();
    /** 即時実行するためのPromiseチェーン */
    private starter = Promise.resolve();

    /**
     * Creates an instance of LimitExecutor.
     * @param concurrency 同時実行数の最大値
     * @memberof LimitExecutor
     */
    private constructor(private concurrency: number) {}

    /**
     * このExecutorで同時に実行できる最大数をconcurrencyに制限してタスクを非同期に実行します。
     * @private
     * @param task 実行するタスク。
     * @returns タスクの実行結果
     * @memberof LimitExecutor
     */
    private async exec<R>(task: () => R): Promise<Awaited<R>> {
        // 待機状態で開始
        await this.pending();
        ++this.activeCount;
        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable -- taskは基本的にPromiseを返す
            return await task();
        } finally {
            --this.activeCount;
            if (this.activeCount < this.concurrency) {
                // activeCountが減って余裕ができれば、次のタスクの待機を解除する
                this.resumeNext();
            }
        }
    }

    /**
     * 待機状態のPromiseを返します。
     * @private
     * @returns 待機状態のPromise
     * @memberof LimitExecutor
     */
    private pending() {
        try {
            // 待機状態にします
            return new Promise<void>(this.queue.enqueue);
        } finally {
            // と同時に待機解除を予約します。
            this.starter = this.starter.then(() => {
                if (this.activeCount < this.concurrency) {
                    // 余裕があれば開始
                    this.resumeNext();
                }
            });
        }
    }

    /**
     * pendingで生成されたPromiseの待機状態を解除します。
     * @private
     * @memberof LimitExecutor
     */
    private resumeNext() {
        this.queue.dequeue()?.();
    }

    /**
     * 同時実行数の最大値を設定します。
     *
     * より大きい数値に変更すると、待機中のタスクから追加で実行開始します。
     *
     * より小さい数値に変更した場合は何もしません。
     * @param newConcurrency 同時実行数の最大値。
     */
    private setConcurrency(newConcurrency: number) {
        LimitExecutor.validation(newConcurrency);
        this.concurrency = newConcurrency;
        let count = this.concurrency - this.activeCount;
        while (count-- > 0) {
            this.resumeNext();
        }
    }

    /**
     * LimitFunctionのプロパティを定義するPropertyDescriptorを返します。
     * @readonly
     * @private
     * @type {TypedPropertyDescriptors<LimitFunction>}
     * @memberof LimitExecutor
     */
    private get descriptors(): TypedPropertyDescriptors<LimitFunction> {
        // 最初に1回使用するだけなので値そのものではなくgetterで実装しています。
        return {
            activeCount: { get: () => this.activeCount },
            pendingCount: { get: () => this.queue.size },
            concurrency: {
                get: () => this.concurrency,
                set: this.setConcurrency.bind(this),
            },
            clearQueue: { value: this.queue.clear },
        };
    }

    /**
     * 外部に公開するAPIの引数が適切なものかチェックして、不適切であれば例外を投げます。
     * @static
     * @param concurrency 並列実行する最大数を指定します。
     * @memberof LimitExecutor
     * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
     */
    private static validation(concurrency: number) {
        // 引数のチェック
        if (typeof concurrency === 'number' && concurrency >= 1) {
            return;
        }
        throw new TypeError(
            'Expected `concurrency` to be a number from 1 and up',
        );
    }

    /**
     * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
     * @param concurrency 並列実行する最大数を指定します。
     *
     * 1以上の数値を指定できます。
     * @returns 生成した`limit`関数を返します。
     * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
     */
    static generate(concurrency: number): LimitFunction {
        LimitExecutor.validation(concurrency);
        const executor = new LimitExecutor(concurrency);
        const limit: LimitFunctionBase = (task, ...parameters) =>
            executor.exec(() => task(...parameters));
        return Object.defineProperties(limit, executor.descriptors);
    }
}

/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrency 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
export default function pLimit(concurrency: number): LimitFunction {
    return LimitExecutor.generate(concurrency);
}
