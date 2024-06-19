"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
/**
 * The light weight queue.
 * @returns The instance of the light weight queue.
 */
function Queue() {
    const terminal = {};
    let size = 0;
    const clear = () => {
        delete terminal.next;
        delete terminal.tail;
        size = 0;
    };
    return {
        get size() {
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
            }
            else {
                clear();
            }
            return head.value;
        },
        clear,
    };
}
exports.Queue = Queue;
//# sourceMappingURL=Queue.js.map