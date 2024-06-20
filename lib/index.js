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
    async exec(task) {
        // 待機状態で開始
        await this.pending();
        ++this.activeCount;
        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable -- taskは基本的にPromiseを返す
            return await task();
        }
        finally {
            --this.activeCount;
            if (this.activeCount < this.concurrency) {
                // activeCountが減って余裕ができれば、次のタスクの待機を解除する
                this.resumeNext();
            }
        }
    }
    /**
     * 次のタスクを実行可能な状態であれば待機を解除します。
     * @private
     * @param count 待機解除するタスクの数を指定します。省略したときは1を指定したものと見なします。
     * @memberof LimitExecutor
     */
    reserveStart(count = 1) {
        for (let rest = count; rest-- > 0;) {
            // 前のタスク開始よりあとに行う
            this.starter = this.starter.then(() => {
                if (this.activeCount < this.concurrency) {
                    // 余裕があれば開始
                    this.resumeNext();
                }
            });
        }
    }
    /**
     * 待機状態のPromiseを返します。
     * @private
     * @returns 待機状態のPromise
     * @memberof LimitExecutor
     */
    pending() {
        try {
            // 待機状態にします
            return new Promise(this.queue.enqueue);
        }
        finally {
            // と同時に待機解除を予約します。
            this.reserveStart();
        }
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
     * 同時実行数の最大値を設定します。
     *
     * より大きい数値に変更すると、待機中のタスクから追加で実行開始します。
     *
     * より小さい数値に変更した場合は何もしません。
     * @param newConcurrency 同時実行数の最大値。
     */
    setConcurrency(newConcurrency) {
        LimitExecutor.validation(newConcurrency);
        this.concurrency = newConcurrency;
        this.reserveStart(this.concurrency - this.activeCount);
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
        const limit = (task, ...parameters) => executor.exec(() => task(...parameters));
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