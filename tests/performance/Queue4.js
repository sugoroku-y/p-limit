/**
 * enqueueでのNode生成時にnextを明示的に指定したもの。
 * @returns Queue<T>のインスタンス
 */
module.exports = function Queue4() {
    /** @typedef {{value:unknown;next?:Node|undefined}} Node */

    /** @type {Node | undefined} */
    let head;
    /** @type {Node | undefined} */
    let tail;
    let size = 0;

    /**
     *  キューに値を追加する。
     * @param {unknown} value 追加する値
     */
    function enqueue(value) {
        const node = { value, next: undefined };

        if (head) {
            tail.next = node;
            tail = node;
        } else {
            head = node;
            tail = node;
        }

        size++;
    }

    function dequeue() {
        const current = head;
        if (!current) {
            return;
        }

        head = current.next;
        size--;
        return current.value;
    }

    function peek() {
        return head?.value;
    }

    function clear() {
        head = undefined;
        tail = undefined;
        size = 0;
    }

    return {
        get size() {
            return size;
        },
        *[Symbol.iterator]() {
            let current = head;

            while (current) {
                yield current.value;
                current = current.next;
            }
        },
        enqueue,
        dequeue,
        peek,
        clear,
    };
};
