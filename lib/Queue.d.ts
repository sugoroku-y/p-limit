interface Queue<T> {
    clear(): void;
    dequeue(): T | undefined;
    enqueue(value: T): void;
    readonly size: number;
}
/**
 * 軽量版Queue
 * @returns 軽量版Queueのインスタンス
 */
export declare function Queue<T>(): Queue<T>;
export {};
