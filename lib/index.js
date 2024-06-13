"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = require("./Queue");
/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrency 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
function pLimit(concurrency) {
    // 引数のチェック
    if (!(typeof concurrency === 'number' && concurrency >= 1)) {
        throw new TypeError('Expected `concurrency` to be a number from 1 and up');
    }
    // 実行中のタスクの数
    let activeCount = 0;
    // 待機中のタスク
    const pending = (0, Queue_1.Queue)();
    const limit = async (task, ...parameters) => {
        if (activeCount >= concurrency) {
            // 余裕がなければ待機
            await new Promise((resolve) => 
            // resolveが呼ばれるまで待機
            pending.enqueue(resolve));
        }
        // タスクが実行中にactiveCountが1つだけ増えるように
        ++activeCount;
        try {
            return await task(...parameters);
        }
        finally {
            // activeCountを減らしてもconcurrency以上であることはないはずではあるが念の為チェック
            if (--activeCount < concurrency) {
                // activeCountが減って余裕ができたので、次のタスクの待機を解除する
                pending.dequeue()?.();
            }
        }
    };
    // 各プロパティ/メソッドの用意
    return Object.defineProperties(limit, {
        activeCount: { get: () => activeCount },
        pendingCount: { get: () => pending.size },
        clearQueue: { value: () => pending.clear() },
    });
}
exports.default = pLimit;
//# sourceMappingURL=index.js.map