export interface Queue<T> extends Iterable<T> {
    /**
     * The size of the queue.
     */
    readonly size: number;
    /**
     * Add a value to the queue.
     * @param value The value to be added.
     */
    enqueue(this: void, value: T): void;
    /**
     * Remove the next value in the queue.
     * @returns The removed value or `undefined` if the queue is empty.
     */
    dequeue(this: void): T | undefined;
    /**
     * Clear the queue.
     */
    clear(this: void): void;
}

/**
 * The light weight queue.
 * @returns The instance of the light weight queue.
 */
export function Queue<T>(): Queue<T> {
    interface Node {
        next?: Node;
    }

    let terminal: { head: Node; tail: Node } | undefined;
    let size = 0;
    const values = new WeakMap<Node, T>();

    function clear() {
        terminal = undefined;
        size = 0;
    }

    function enqueue(value: T) {
        const node: Node = {};
        values.set(node, value);
        if (terminal) {
            // キューが空でなければ末尾の次に追加
            terminal.tail.next = node;
            // 末尾のNodeを記憶しておく
            terminal.tail = node;
            ++size;
        } else {
            // キューが空ならnode1つだけのキューにする
            terminal = { head: node, tail: node };
            size = 1;
        }
    }

    function dequeue() {
        if (!terminal) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const { next } = terminal.head;
        const value = values.get(terminal.head);
        if (next) {
            // まだNodeが残っていれば先頭を次のNodeに差し替え
            terminal.head = next;
            --size;
        } else {
            clear();
        }
        return value;
    }

    function* iterator() {
        for (let node = terminal?.head; node; node = node.next) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- nodeは常にvalueを持っているはず
            yield values.get(node)!;
        }
    }

    return {
        get size(): number {
            return size;
        },
        enqueue,
        dequeue,
        clear,
        [Symbol.iterator]: iterator,
    };
}
