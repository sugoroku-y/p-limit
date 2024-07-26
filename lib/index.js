"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pLimit;
const Queue_1 = require("./Queue");
/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrencySpec 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws `concurrencySpec`に不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
function pLimit(concurrencySpec) {
    /** 並列実行する最大数 */
    let concurrency;
    // 引数のチェック、設定
    setConcurrency(concurrencySpec);
    /** 実行中のタスクの数 */
    let activeCount = 0;
    /** 待機中のタスク */
    const queue = (0, Queue_1.Queue)();
    return Object.defineProperties((async (task, ...parameters) => {
        // 先に余裕があれば開始する処理を予約しておきます
        queueMicrotask(resumeNext);
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
            set: (newConcurrency) => {
                setConcurrency(newConcurrency);
                // 増えた分だけ待機解除します
                while (resumeNext())
                    ;
            },
        },
    });
    /**
     * concurrencyに値を設定します。
     *
     * 指定した値が適切なものかチェックして、不適切であれば例外を投げます。
     * @param concurrencySpec 並列実行する最大数を指定します。
     * @throws `concurrencySpec`が不正な値(数値以外や1未満の数値)だったときに例外を投げます。
     */
    function setConcurrency(concurrencySpec) {
        // concurrencyのチェック
        if (!(typeof concurrencySpec === 'number' && concurrencySpec >= 1)) {
            throw new TypeError('Expected `concurrency` to be a number from 1 and up');
        }
        concurrency = concurrencySpec;
    }
    /**
     * Promiseの待機状態を解除します。
     * @returns 実際に待機状態を解除したときはtrueを返します。
     *
     * 以下の状態のときはfalseを返します。
     * - activeCountがconcurrency以上
     * - queueが空
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
}
//# sourceMappingURL=index.js.map