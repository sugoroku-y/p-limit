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
    return {
        get size() {
            return tail - head;
        },
        // eslint-disable-next-line jsdoc/require-param-description -- -
        /** @param value */
        enqueue(value) {
            array[tail++] = value;
            if (tail === Number.MAX_SAFE_INTEGER) {
                array = array.slice(head);
                tail -= head;
                head = 0;
            }
        },
        dequeue() {
            if (head >= tail) {
                return undefined;
            }
            const value = array[head];
            // 参照を切るためにundefinedを代入
            array[head++] = undefined;
            if (head === tail) {
                head = tail = 0;
            }
            return value;
        },
        peek() {
            return head < tail ? array[head] : undefined;
        },
        clear() {
            array.length = head = tail = 0;
        },
        *[Symbol.iterator]() {
            for (let i = head; i < tail; ++i) {
                yield array[i];
            }
        },
    };
};
