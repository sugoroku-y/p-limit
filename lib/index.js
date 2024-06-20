"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = require("./Queue");
/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrencySpec 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
function pLimit(concurrencySpec) {
    validation(concurrencySpec);
    /** 並列実行する最大数 */
    let concurrency = concurrencySpec;
    /** 実行中のタスクの数 */
    let activeCount = 0;
    /** 待機中のタスク */
    const queue = (0, Queue_1.Queue)();
    /** 即時実行するためのPromiseチェーン */
    let starter = Promise.resolve();
    return Object.defineProperties((async (task, ...parameters) => {
        // 待機状態で開始
        await pending();
        ++activeCount;
        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable -- taskは通常Promiseを返すので問題ない
            return await task(...parameters);
        }
        finally {
            --activeCount;
            if (activeCount < concurrency) {
                // activeCountが減って余裕ができれば、次のタスクの待機を解除する
                resumeNext();
            }
        }
    }), {
        activeCount: { get: () => activeCount },
        pendingCount: { get: () => queue.size },
        clearQueue: { value: queue.clear },
        concurrency: {
            get: () => concurrency,
            set: setConcurrency,
        },
    });
    /**
     * 外部に公開するAPIの引数が適切なものかチェックして、不適切であれば例外を投げます。
     * @static
     * @param concurrency 並列実行する最大数を指定します。
     * @memberof LimitExecutor
     * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
     */
    function validation(concurrency) {
        // 引数のチェック
        if (typeof concurrency === 'number' && concurrency >= 1) {
            return;
        }
        throw new TypeError('Expected `concurrency` to be a number from 1 and up');
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
        return new Promise(queue.enqueue);
    }
    /**
     * 同時実行数の最大値を設定します。
     *
     * より大きい数値に変更すると、待機中のタスクから追加で実行開始します。
     *
     * より小さい数値に変更した場合は何もしません。
     * @param newConcurrency 同時実行数の最大値。
     */
    function setConcurrency(newConcurrency) {
        validation(newConcurrency);
        concurrency = newConcurrency;
        // 増えた分だけ待機解除
        let count = concurrency - activeCount;
        while (count-- > 0) {
            resumeNext();
        }
    }
}
exports.default = pLimit;
//# sourceMappingURL=index.js.map