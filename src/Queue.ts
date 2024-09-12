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
function Queue<T>(blockSizeSpec?: number): Queue<T> {
    interface Node extends Array<T> {
        next?: Node;
    }
    let head: Node;
    let headIndex: number;
    let tail: Node;
    let blockSize = blockSizeSpec ?? BLOCK_MAX_COUNT;

    // 初期化
    clear();
    return {
        get size() {
            return getSize();
        },
        get blockSize() {
            return blockSize;
        },
        set blockSize(v) {
            blockSize = v;
        },
        [Symbol.iterator]: iterator,
        enqueue,
        dequeue,
        peek,
        clear,
    };

    function enqueue(value: T) {
        if (tail.length >= blockSize) {
            tail = tail.next = [];
        }
        tail.push(value);
    }

    function dequeue() {
        if (head.length === 0) {
            // キューが空ならundefinedを返します。
            return undefined;
        }
        const value = head[headIndex];
        // 参照を切るためにundefinedを代入します
        head[headIndex] = undefined as T;

        if (++headIndex >= head.length) {
            // headIndexがheadの終端に到達したら
            if (head.next) {
                // 次があれば先頭を差し替えます
                head = head.next;
                headIndex = 0;
            } else {
                // 次がなければ空になったのでクリアします
                clear();
            }
        }
        return value;
    }

    function peek() {
        // キューが空の場合はheadも空なのでundefinedを返します
        return head[headIndex];
    }

    function clear() {
        tail = head = [];
        headIndex = 0;
    }

    function* iterator() {
        // headではheadIndexから要素ごとにyieldを使います
        for (let i = headIndex; i < head.length; ++i) {
            yield head[i];
        }
        // next以降は配列全体なのでyield*を使います
        for (let node = head.next; node; node = node.next) {
            yield* node;
        }
    }

    function getSize() {
        // sizeは滅多に使用しない、またnextが存在することもまれという想定のため、毎回計算します
        let size = head.length - headIndex;
        for (let node = head.next; node; node = node.next) {
            size += node.length;
        }
        return size;
    }
}

const BLOCK_MAX_COUNT = 0x100000;

export { Queue };
