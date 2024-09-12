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
declare function Queue<T>(): Queue<T>;
declare namespace Queue {
    var MAX_COUNT: 1048576;
}
export { Queue };
