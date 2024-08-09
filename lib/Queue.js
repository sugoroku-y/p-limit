"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = Queue;
/**
 * The light weight queue.
 * @returns The instance of the light weight queue.
 */
function Queue() {
    const terminal = {};
    let size = 0;
    function clear() {
        // クリアするのはnextだけでよい
        terminal.next = undefined;
        size = 0;
    }
    function enqueue(value) {
        const node = { value };
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
        terminal.next = next;
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