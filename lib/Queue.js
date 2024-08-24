"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = Queue;
/**
 * The light weight queue.
 * @returns The instance of the light weight queue.
 */
function Queue() {
    let terminal;
    let size = 0;
    function clear() {
        terminal = undefined;
        size = 0;
    }
    function enqueue(value) {
        const node = { value, next: undefined };
        if (terminal) {
            // キューに存在していれば末尾の次に追加
            terminal.tail = terminal.tail.next = node;
        }
        else {
            // 空だったらnode1つだけのキューにする
            terminal = { head: node, tail: node };
        }
        ++size;
    }
    function dequeue() {
        if (!terminal) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const { next, value } = terminal.head;
        if (next) {
            // 先頭を次のNodeに差し替え
            terminal.head = next;
        }
        else {
            // 空になったのでクリア
            terminal = undefined;
        }
        --size;
        return value;
    }
    function peek() {
        return terminal?.head.value;
    }
    function* iterator() {
        for (let node = terminal?.head; node; node = node.next) {
            yield node.value;
        }
    }
    return {
        get size() {
            return size;
        },
        enqueue,
        dequeue,
        peek,
        clear,
        [Symbol.iterator]: iterator,
    };
}
//# sourceMappingURL=Queue.js.map