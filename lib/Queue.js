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
    let size = 0;
    return Object.freeze({
        clear() {
            term.next = undefined;
            tail = undefined;
            size = 0;
        },
        dequeue() {
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
        enqueue(value) {
            tail = (tail ?? term).next = { value };
            ++size;
        },
        get size() {
            return size;
        },
    });
}
exports.Queue = Queue;
//# sourceMappingURL=Queue.js.map