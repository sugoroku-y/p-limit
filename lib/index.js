"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = require("./Queue");
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
    return generate();
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
     */
    function resumeNext() {
        const resolve = queue.dequeue();
        if (!resolve) {
            return;
        }
        resolve();
        // pendingCountを1つ減らしたので、activeCountを1つ増やす
        ++activeCount;
    }
    /**
     * 待機状態のPromiseを返します。
     * @returns 待機状態のPromise
     */
    function pending() {
        // 余裕があれば待機を解除する処理を予約しておきます。
        (async () => {
            await Promise.resolve();
            if (activeCount < concurrency) {
                resumeNext();
            }
        })();
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
        while (activeCount < concurrency) {
            resumeNext();
        }
    }
    /**
     * タスクをconcurrencyで指定された並列実行最大数に制限して実行します。
     * @template Parameters タスクに渡される引数の型です。
     * @template ReturnType タスクが返す返値の型です。
     * @param task 実行するタスクを指定します。
     * @param parameters タスクに渡される引数を指定します。
     * @returns タスクの実行が完了したらタスクの返値を返すPromiseを返します。
     */
    async function limit(task, ...parameters) {
        // 待機状態で開始
        await pending();
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
    }
    /**
     * limit関数にLimitFunctionのプロパティを付加して返します。
     * @returns LimitFunctionのプロパティ付きlimit関数
     */
    function generate() {
        return Object.defineProperties(limit, {
            activeCount: { get: () => activeCount },
            pendingCount: { get: () => queue.size },
            clearQueue: { value: queue.clear },
            concurrency: {
                get: () => concurrency,
                set: setConcurrency,
            },
        });
    }
}
exports.default = pLimit;
//# sourceMappingURL=index.js.map