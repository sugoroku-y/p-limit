interface Node<T> {
    value: T;
    next?: Node<T>;
}

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
export function Queue<T>(): Queue<T> {
    const term: { next?: Node<T> | undefined } = {};
    let tail: Node<T> | undefined;

    return Object.freeze({
        clear() {
            term.next = undefined;
            tail = undefined;
        },
        dequeue(): T | undefined {
            const head = term.next;
            if (!head) {
                return undefined;
            }
            term.next = head.next;
            if (!term.next) {
                tail = undefined;
            }
            return head.value;
        },
        enqueue(value: T) {
            tail = (tail ?? term).next = { value };
        },
        get size(): number {
            let size = 0;
            for (let node = term.next; node; node = node.next) {
                ++size;
            }
            return size;
        },
    });
}
