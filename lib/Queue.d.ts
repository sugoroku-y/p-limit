export interface Queue<T> {
    clear(this: void): void;
    dequeue(this: void): T | undefined;
    enqueue(this: void, value: T): void;
    readonly size: number;
}
/**
 * 軽量版Queue
 * @returns 軽量版Queueのインスタンス
 */
export declare function Queue<T>(): Queue<T>;
