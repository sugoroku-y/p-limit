interface Node<T> {
    value: T;
    next?: Node<T>;
}

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
            return head ? ((term.next = head.next), head.value) : undefined;
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
