const blockSize = 4096;

/**
 * The light weight queue.
 * @returns The instance of the light weight queue.
 */
module.exports = function Queue5() {
    /** @typedef {{values:unknown[];end:number;next?:Node|undefined}} Node */
    /** @typedef {{head:Node;tail: Node}} Terminal */

    /** @type {Terminal | undefined} */
    let terminal;
    let head = 0;
    let size = 0;

    function clear() {
        terminal = undefined;
        head = 0;
        size = 0;
    }

    function enqueue(value) {
        if (!terminal) {
            const head = {
                values: Array(blockSize),
                end: 0,
                next: undefined,
            };
            const tail = head;
            terminal = { head, tail };
        } else if (terminal.tail.end >= terminal.tail.values.length) {
            terminal.tail.next = {
                values: Array(blockSize),
                end: 0,
                next: undefined,
            };
            terminal.tail = terminal.tail.next;
        }
        terminal.tail.values[terminal.tail.end++] = value;
        ++size;
    }

    function dequeue() {
        if (!terminal) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const {
            next,
            values: { [head]: value },
        } = terminal.head;
        terminal.head.values[head++] = undefined;
        if (head >= terminal.head.end) {
            if (next) {
                // 先頭を次のNodeに差し替え
                terminal.head = next;
            } else {
                // 空になったのでクリア
                terminal = undefined;
            }
            head = 0;
        }
        --size;
        return value;
    }

    function peek() {
        return terminal?.head.values[head];
    }

    function* iterator() {
        let start = head;
        for (let node = terminal?.head; node; node = node.next) {
            yield* node.values.slice(start, node.end);
            start = 0;
        }
    }

    return {
        get size() {
            return size;
        },
        enqueue,
        dequeue,
        peek,
        clear,
        [Symbol.iterator]: iterator,
    };
};
