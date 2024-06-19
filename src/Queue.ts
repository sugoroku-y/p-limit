export interface Queue<T> {
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
export function Queue<T>(): Queue<T> {
    interface Node<T> {
        value: T;
        next?: Node<T>;
    }

    const terminal: {
        next?: Node<T>;
        tail?: Node<T>;
    } = {};
    let size = 0;

    const clear = () => {
        delete terminal.next;
        delete terminal.tail;
        size = 0;
    };

    return {
        get size(): number {
            return size;
        },
        enqueue(value) {
            terminal.tail = (terminal.tail ?? terminal).next = { value };
            ++size;
        },
        dequeue() {
            const head = terminal.next;
            if (!head) {
                return undefined;
            }
            if (head.next) {
                terminal.next = head.next;
                --size;
            } else {
                clear();
            }
            return head.value;
        },
        clear,
    };
}
