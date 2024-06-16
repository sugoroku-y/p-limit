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
    private constructor(private readonly concurrency: number) {}

    /**
     * このExecutorで同時に実行できる最大数をconcurrencyに制限してタスクを非同期に実行します。
     * @private
     * @param task 実行するタスク。
     * @returns タスクの実行結果
     * @memberof LimitExecutor
     */
    private exec(task: () => Promise<unknown>): Promise<unknown> {
        try {
            // taskをQueueに積みます。
            return this.enqueue(task);
        } finally {
            // 同時にtaskの実行開始を予約します。
            this.starter = this.reserveStart();
            // execはasync関数ではなくenqueueにもawaitが付いていないのでreserveStartは並列に実行されます。
        }
    }

    /**
     * タスクをキューに積み、実行可能になったら実行して、結果を返します。
     * @private
     * @param task 実行するタスク
     * @returns タスクの実行結果
     * @memberof LimitExecutor
     */
    private async enqueue(task: () => Promise<unknown>): Promise<unknown> {
        await this.pending();
        ++this.activeCount;
        try {
            return await task();
        } finally {
            --this.activeCount;
            // activeCountが減って余裕ができれば、次のタスクの待機を解除する
            this.resumeNext();
        }
    }

    /**
     * 次のタスクを実行可能な状態であれば待機を解除します。
     * @private
     * @memberof LimitExecutor
     */
    private async reserveStart() {
        await this.starter;
        if (this.activeCount < this.concurrency) {
            // 余裕があれば開始
            this.resumeNext();
        }
    }

    /**
     * 待機状態のPromiseを返します。
     * @private
     * @returns 待機状態のPromise
     * @memberof LimitExecutor
     */
    private pending() {
        return new Promise<void>((resolve) => this.queue.enqueue(resolve));
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
            clearQueue: { value: () => this.queue.clear() },
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
    static generate(concurrency: number) {
        LimitExecutor.validation(concurrency);
        const executor = new LimitExecutor(concurrency);
        const limit: FunctionType<LimitFunction> = (task, ...parameters) =>
            executor.exec(async () => task(...parameters));
        return Object.defineProperties(
            limit,
            executor.descriptors,
        ) as LimitFunction;
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
export default function pLimit(concurrency: number) {
    return LimitExecutor.generate(concurrency);
}
