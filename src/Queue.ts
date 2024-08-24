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
     * Get the next value in the queue without removing it.
     * @returns The value or `undefined` if the queue is empty.
     */
    peek(): T | undefined;
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
        value: T;
        next: Node | undefined;
    }
    interface Terminal {
        head: Node;
        tail: Node;
    }

    let terminal: Terminal | undefined;
    let size = 0;

    function clear() {
        terminal = undefined;
        size = 0;
    }

    function enqueue(value: T) {
        const node: Node = { value, next: undefined };
        if (terminal) {
            // キューに存在していれば末尾の次に追加
            terminal.tail = terminal.tail.next = node;
        } else {
            // 空だったらnode1つだけのキューにする
            terminal = { head: node, tail: node };
        }
        ++size;
    }

    function dequeue() {
        if (!terminal) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const { next, value } = terminal.head;
        if (next) {
            // 先頭を次のNodeに差し替え
            terminal.head = next;
        } else {
            // 空になったのでクリア
            terminal = undefined;
        }
        --size;
        return value;
    }

    function peek() {
        return terminal?.head.value;
    }

    function* iterator() {
        for (let node = terminal?.head; node; node = node.next) {
            yield node.value;
        }
    }

    return {
        get size(): number {
            return size;
        },
        enqueue,
        dequeue,
        peek,
        clear,
        [Symbol.iterator]: iterator,
    };
}
