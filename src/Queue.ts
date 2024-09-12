interface Queue<T> extends Iterable<T> {
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
    peek(this: void): T | undefined;
    /**
     * Clear the queue.
     */
    clear(this: void): void;
}

/**
 * The light weight queue.
 * @returns The instance of the light weight queue.
 */
function Queue<T>(): Queue<T> {
    interface Node extends Array<T> {
        next?: Node | undefined;
    }
    let head: Node;
    let headIndex: number;
    let tail: Node;
    clear();

    function enqueue(value: T) {
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
        head[headIndex] = undefined as T;

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
}

Queue.MAX_COUNT = 0x100000 as const;

export { Queue };
