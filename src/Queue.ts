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
    peek(): T | undefined;
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
    interface Node {
        value: T;
        next?: Node;
    }
    // terminal.nextはキューの先頭(headなどにしなかったのはnextで揃えることでenqueueで楽をするため)
    type Terminal =
        // nextとtailのどちらもが存在しているか
        | { next: Node; tail: Node }
        // どちらもが存在していないかの二択
        | { next?: undefined; tail?: undefined };

    const terminal: Terminal = {};
    let size = 0;

    function clear() {
        // クリアするのはnextだけでよい
        terminal.next = undefined;
        size = 0;
    }

    function enqueue(value: T) {
        const node: Node = { value };
        // キューに存在していれば末尾の次に、空ならば先頭に追加
        (terminal.next ? terminal.tail : terminal).next = node;
        // 末尾のNodeを記憶しておく
        terminal.tail = node;
        ++size;
    }

    function dequeue() {
        if (!terminal.next) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const { next, value } = terminal.next;
        // 先頭を次のNodeに差し替え(↑のif文でnextにundefinedが代入できなくなっているので型アサーションを追加)
        (terminal as Terminal).next = next;
        --size;
        return value;
    }

    function peek() {
        return terminal.next?.value;
    }

    function* iterator() {
        for (let node = terminal.next; node; node = node.next) {
            yield node.value;
        }
    }

    return {
        get size(): number {
            return size;
        },
        enqueue,
        dequeue,
        peek,
        clear,
        [Symbol.iterator]: iterator,
    };
}
