"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const squash = () => { };
const neverResolved = new Promise(squash);
const cache = [];
function returnIndex(index) {
    return (cache[index] ??= () => index);
}
/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param maxWorkers 並列実行する最大数を指定します。
 *
 * 正の整数値、もしくは`Infinity`を指定できます。
 *
 * ただし、 $2^32$ 以上を指定した場合、並列実行数の制限を行いません。
 * @returns 生成した`limit`関数を返します。
 * @throws maxWorkersに不正な値(`Infinity`と正の整数以外)を指定したときに例外を投げます。
 */
function pLimit(maxWorkers) {
    if (!(maxWorkers === Infinity ||
        (Number.isInteger(maxWorkers) && maxWorkers > 0))) {
        throw new TypeError('Expected `maxWorkers` to be a number from 1 and up');
    }
    if (maxWorkers >= 2 ** 32) {
        // 2^32以上は配列を生成できないので同時実行数を制限しない
        return noLimit();
    }
    return nLimit(maxWorkers);
}
exports.default = pLimit;
class ActiveCounter {
    count = 0;
    activate = async (f, ...p) => {
        ++this.count;
        try {
            return await f(...p);
        }
        finally {
            --this.count;
        }
    };
    getter = () => this.count;
}
function noLimit() {
    // activeCountの管理だけ行う
    const activeCount = new ActiveCounter();
    return Object.defineProperties(activeCount.activate, {
        // 待機中のタスクは常になし
        pendingCount: { get: returnIndex(0) },
        // activeCountは管理しているものを返す
        activeCount: { get: activeCount.getter },
        // 待機中のタスクが常にないのでclearQueueでも何もしない
        clearQueue: { value: squash },
    });
}
function nLimit(length) {
    // 指定された数だけ枠を用意しておく
    const slots = Array.from({ length }, (_, i) => Promise.resolve(i));
    // 空き枠の検索結果を保持するPromise
    let nextIndex = Promise.resolve(NaN);
    let context = {
        pendingCount: 0,
    };
    const activeCount = new ActiveCounter();
    const limit = async (task, ...parameters) => {
        const current = context;
        ++current.pendingCount;
        // 一つ前のタスクでの検索が終わってから、このタスクでの検索を開始する
        nextIndex = nextIndex.then(() => Promise.race(slots));
        // 空き枠の検索
        const index = await nextIndex;
        if (current !== context) {
            // contextがリセットされたら古いcontextで始まったtaskは開始しない
            return neverResolved;
        }
        --current.pendingCount;
        return activeCount.activate(() => {
            // タスクを開始
            const promise = task(...parameters);
            // このtaskが完了したらindexを返すPromiseに差し替える
            slots[index] = Promise.resolve(promise)
                .catch(squash)
                .then(returnIndex(index));
            // taskの返値をそのまま返す
            return promise;
        });
    };
    return Object.defineProperties(limit, {
        activeCount: { get: activeCount.getter },
        pendingCount: { get: () => context.pendingCount },
        clearQueue: {
            value: () => {
                // contextをリセット
                context = { pendingCount: 0 };
            },
        },
    });
}
//# sourceMappingURL=index.js.map