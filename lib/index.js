"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pLimit;
const Queue_1 = require("./Queue");
const nextMicroTask = Promise.resolve();
/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrencySpec 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws `concurrency`に不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
function pLimit(concurrencySpec) {
    validation(concurrencySpec);
    /** 並列実行する最大数 */
    let concurrency = concurrencySpec;
    /** 実行中のタスクの数 */
    let activeCount = 0;
    /** 待機中のタスク */
    const queue = (0, Queue_1.Queue)();
    return Object.defineProperties((async (task, ...parameters) => {
        // 先に余裕があれば開始する処理を予約しておきます
        void nextMicroTask.then(resumeNext);
        // 待機状態で開始します
        await new Promise(queue.enqueue);
        try {
            return await task(...parameters);
        }
        finally {
            // taskが完了したら1つ減らします
            --activeCount;
            // 次のタスクを開始します。
            resumeNext();
        }
    }), // satisfiesを指定することで引数を型推論します
    {
        activeCount: { get: () => activeCount },
        pendingCount: { get: () => queue.size },
        clearQueue: { value: queue.clear, writable: true },
        concurrency: {
            get: () => concurrency,
            set: setConcurrency,
        },
    });
    /**
     * `concurrency`が適切なものかチェックして、不適切であれば例外を投げます。
     * @param concurrency 並列実行する最大数を指定します。
     * @throws `concurrency`が不正な値(数値以外や1未満の数値)だったときに例外を投げます。
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
     * @returns 実際に待機状態を解除したときはtrueを返します。
     */
    function resumeNext() {
        if (activeCount < concurrency) {
            const resolve = queue.dequeue();
            if (resolve) {
                resolve();
                // pendingCountを1つ減らしたので、activeCountを1つ増やします
                ++activeCount;
                return true;
            }
        }
        return false;
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
        // 増えた分だけ待機解除します
        while (resumeNext())
            ;
    }
}
//# sourceMappingURL=index.js.map