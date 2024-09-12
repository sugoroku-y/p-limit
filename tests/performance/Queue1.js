/**
 * 配列を使用したキュー
 *
 * unshiftはコストが高いので先頭のインデックスを増やしていく。
 * @template T
 * @returns {Queue<T>} Queue<T>のインスタンス
 */
module.exports = function Queue1() {
    /** @type {T[]} */
    let array = [];
    let head = 0;

    /**
     * キューに値を追加する。
     * @param {T} value 追加する値
     */
    function enqueue(value) {
        if (array.length >= BLOCK_MAX_COUNT && head > 0) {
            array = array.slice(head);
            head = 0;
        }
        array.push(value);
    }

    function dequeue() {
        if (head >= array.length) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const value = array[head];
        // 参照を切るためにundefinedを代入
        array[head] = undefined;

        if (++head >= array.length) {
            // 空になったのでクリア
            clear();
        }
        return value;
    }

    function peek() {
        return array[head];
    }

    function clear() {
        array = [];
        head = 0;
    }

    function* iterator() {
        for (let i = head; i < array.length; ++i) {
            yield array[i];
        }
    }

    return {
        get size() {
            return array.length - head;
        },
        [Symbol.iterator]: iterator,
        enqueue,
        dequeue,
        peek,
        clear,
    };
};

const BLOCK_MAX_COUNT = 0x100000;
