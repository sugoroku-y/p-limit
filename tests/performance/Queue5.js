const Queue = require('../../lib/Queue');

/**
 * 配列と1方向リンクリストを使用したキュー
 *
 * unshiftはコストが高いので先頭のインデックスを増やしていく。
 * @template T
 * @returns {Queue<T>} Queue<T>のインスタンス
 */
module.exports = function Queue5() {
    /** @typedef {T[] & {next?: Node | undefined}} Node */

    /** @type {Node}} */
    let head;
    /** @type {number}} */
    let headIndex;
    /** @type {Node}} */
    let tail;
    clear();

    /**
     * キューに値を追加する。
     * @param {T} value 追加する値
     */
    function enqueue(value) {
        if (tail.length >= Queue.MAX_COUNT) {
            tail = tail.next = [];
        }
        tail.push(value);
    }

    function dequeue() {
        if (headIndex >= head.length) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const value = head[headIndex];
        // 参照を切るためにundefinedを代入
        head[headIndex] = undefined;

        if (++headIndex >= head.length) {
            if (head.next) {
                // 先頭を次のNodeに差し替え
                head = head.next;
                headIndex = 0;
            } else {
                // 空になったのでクリア
                clear();
            }
        }
        return value;
    }

    function peek() {
        return head[headIndex];
    }

    function clear() {
        tail = head = [];
        headIndex = 0;
    }

    function* iterator() {
        for (let i = headIndex; i < head.length; ++i) {
            yield head[i];
        }
        for (let node = head.next; node; node = node.next) {
            yield* node;
        }
    }

    return {
        get size() {
            let size = head.length - headIndex;
            for (let node = head.next; node; node = node.next) {
                size += node.length;
            }
            return size;
        },
        [Symbol.iterator]: iterator,
        enqueue,
        dequeue,
        peek,
        clear,
    };
};
