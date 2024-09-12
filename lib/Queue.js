"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = Queue;
/**
 * The light weight queue.
 * @returns The instance of the light weight queue.
 */
function Queue() {
    let head;
    let headIndex;
    let tail;
    clear();
    function enqueue(value) {
        if (tail.length >= Queue.MAX_COUNT) {
            tail = tail.next = [];
        }
        tail.push(value);
    }
    function dequeue() {
        if (headIndex >= head.length) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const value = head[headIndex];
        // 参照を切るためにundefinedを代入
        head[headIndex] = undefined;
        if (++headIndex >= head.length) {
            if (head.next) {
                // 先頭を次のNodeに差し替え
                head = head.next;
                headIndex = 0;
            }
            else {
                // 空になったのでクリア
                clear();
            }
        }
        return value;
    }
    function peek() {
        return head[headIndex];
    }
    function clear() {
        tail = head = [];
        headIndex = 0;
    }
    function* iterator() {
        for (let i = headIndex; i < head.length; ++i) {
            yield head[i];
        }
        for (let node = head.next; node; node = node.next) {
            yield* node;
        }
    }
    return {
        get size() {
            let size = head.length - headIndex;
            for (let node = head.next; node; node = node.next) {
                size += node.length;
            }
            return size;
        },
        [Symbol.iterator]: iterator,
        enqueue,
        dequeue,
        peek,
        clear,
    };
}
Queue.MAX_COUNT = 0x100000;
//# sourceMappingURL=Queue.js.map