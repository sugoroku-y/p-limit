// eslint-disable-next-line @typescript-eslint/no-var-requires -- jsファイルではrequireでよい
const Queue = require('../../lib/Queue');

/**
 * 配列を使用したキュー
 *
 * unshiftはコストが高いので先頭のインデックスを増やしていく。
 * @returns Queue<T>のインスタンス
 */
module.exports = function Queue1() {
    /** @type {unknown[]} */
    let array = [];
    let head = 0;
    let tail = 0;
    function enqueue(value) {
        array[tail++] = value;
        if (tail === Queue.MAX_COUNT) {
            array = array.slice(head);
            tail -= head;
            head = 0;
        }
    }
    function dequeue() {
        if (head >= tail) {
            return undefined;
        }
        const value = array[head];
        // 参照を切るためにundefinedを代入
        array[head++] = undefined;
        if (head >= tail) {
            head = tail = 0;
        }
        return value;
    }
    function peek() {
        return head < tail ? array[head] : undefined;
    }
    function clear() {
        array.length = head = tail = 0;
    }
    function* iterator() {
        for (let i = head; i < tail; ++i) {
            yield array[i];
        }
    }
    return {
        get size() {
            return tail - head;
        },
        [Symbol.iterator]: iterator,
        enqueue,
        dequeue,
        peek,
        clear,
    };
};
