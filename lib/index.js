"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = require("./Queue");
class LimitExecutor {
    concurrency;
    /** 実行中のタスクの数 */
    activeCount = 0;
    /** 待機中のタスク */
    queue = (0, Queue_1.Queue)();
    /** 即時実行するためのPromiseチェーン */
    starter = Promise.resolve();
    /**
     * Creates an instance of LimitExecutor.
     * @param concurrency 同時実行数の最大値
     * @memberof LimitExecutor
     */
    constructor(concurrency) {
        this.concurrency = concurrency;
    }
    /**
     * このExecutorで同時に実行できる最大数をconcurrencyに制限してタスクを非同期に実行します。
     * @private
     * @param task 実行するタスク。
     * @returns タスクの実行結果
     * @memberof LimitExecutor
     */
    exec(task) {
        try {
            // taskをQueueに積みます。
            return this.enqueue(task);
        }
        finally {
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
    async enqueue(task) {
        // 待機状態で開始
        await this.pending();
        ++this.activeCount;
        try {
            return await task();
        }
        finally {
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
    async reserveStart() {
        // 前のタスク開始よりあとに行う
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
    pending() {
        return new Promise(this.queue.enqueue);
    }
    /**
     * pendingで生成されたPromiseの待機状態を解除します。
     * @private
     * @memberof LimitExecutor
     */
    resumeNext() {
        this.queue.dequeue()?.();
    }
    /**
     * LimitFunctionのプロパティを定義するPropertyDescriptorを返します。
     * @readonly
     * @private
     * @type {TypedPropertyDescriptors<LimitFunction>}
     * @memberof LimitExecutor
     */
    get descriptors() {
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
    static validation(concurrency) {
        // 引数のチェック
        if (typeof concurrency === 'number' && concurrency >= 1) {
            return;
        }
        throw new TypeError('Expected `concurrency` to be a number from 1 and up');
    }
    /**
     * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
     * @param concurrency 並列実行する最大数を指定します。
     *
     * 1以上の数値を指定できます。
     * @returns 生成した`limit`関数を返します。
     * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
     */
    static generate(concurrency) {
        LimitExecutor.validation(concurrency);
        const executor = new LimitExecutor(concurrency);
        const limit = (task, ...parameters) => executor.exec(async () => task(...parameters));
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
function pLimit(concurrency) {
    return LimitExecutor.generate(concurrency);
}
exports.default = pLimit;
//# sourceMappingURL=index.js.map