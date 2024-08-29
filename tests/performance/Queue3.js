/**
 * yocto-queueの実装を、クラスを使わないように修正
 * @returns Queue<T>のインスタンス
 */
module.exports = function Queue3() {
    /** @typedef {{value:unknown;next?:Node|undefined}} Node */

    /** @type {Node | undefined} */
    let head;
    /** @type {Node | undefined} */
    let tail;
    let size = 0;

    // eslint-disable-next-line jsdoc/require-description, jsdoc/no-types, jsdoc/require-param-description -- -
    /** @param { unknown } value */
    function enqueue(value) {
        const node = { value };

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
