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
export function Queue<T>(): Queue<T> {
    let array: T[] = [];
    let head = 0;
    let tail = 0;
    function enqueue(value: T) {
        array[tail++] = value;
        if (tail === Number.MAX_SAFE_INTEGER) {
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
        array[head++] = undefined as T;
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
}
