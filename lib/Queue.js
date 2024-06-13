"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
/**
 * 軽量版Queue
 * @returns 軽量版Queueのインスタンス
 */
function Queue() {
    const term = {};
    let tail;
    return Object.freeze({
        clear() {
            term.next = undefined;
            tail = undefined;
        },
        dequeue() {
            const head = term.next;
            return head ? ((term.next = head.next), head.value) : undefined;
        },
        enqueue(value) {
            tail = (tail ?? term).next = { value };
        },
        get size() {
            let size = 0;
            for (let node = term.next; node; node = node.next) {
                ++size;
            }
            return size;
        },
    });
}
exports.Queue = Queue;
//# sourceMappingURL=Queue.js.map