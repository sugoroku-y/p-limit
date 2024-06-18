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
    let size = 0;

    return Object.freeze({
        clear() {
            term.next = undefined;
            tail = undefined;
            size = 0;
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
            --size;
            return head.value;
        },
        enqueue(value: T) {
            tail = (tail ?? term).next = { value };
            ++size;
        },
        get size(): number {
            return size;
        },
    });
}
