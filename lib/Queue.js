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
    const values = new WeakMap();
    function clear() {
        terminal = undefined;
        size = 0;
    }
    function enqueue(value) {
        const node = {};
        values.set(node, value);
        if (terminal) {
            // キューが空でなければ末尾の次に追加
            terminal.tail.next = node;
            // 末尾のNodeを記憶しておく
            terminal.tail = node;
            ++size;
        }
        else {
            // キューが空ならnode1つだけのキューにする
            terminal = { head: node, tail: node };
            size = 1;
        }
    }
    function dequeue() {
        if (!terminal) {
            // キューが空ならundefinedを返す。
            return undefined;
        }
        const { next } = terminal.head;
        const value = values.get(terminal.head);
        if (next) {
            // まだNodeが残っていれば先頭を次のNodeに差し替え
            terminal.head = next;
            --size;
        }
        else {
            clear();
        }
        return value;
    }
    function* iterator() {
        for (let node = terminal?.head; node; node = node.next) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- nodeは常にvalueを持っているはず
            yield values.get(node);
        }
    }
    return {
        get size() {
            return size;
        },
        enqueue,
        dequeue,
        clear,
        [Symbol.iterator]: iterator,
    };
}
//# sourceMappingURL=Queue.js.map