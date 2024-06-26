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
export declare function Queue<T>(): Queue<T>;
