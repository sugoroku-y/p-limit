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
    /**
     * Maximum size of the array blocks used in the queue
     */
    blockSize: number;
}
/**
 * The light weight queue.
 * @param blockSizeSpec キューで使用する配列の最大サイズ
 * @returns The instance of the light weight queue.
 */
declare function Queue<T>(blockSizeSpec?: number): Queue<T>;
export { Queue };
