class Node {
    /** @type {unknown} */
    value;
    /** @type {Node} */
    next;
    constructor(value) {
        this.value = value;
    }
}

class QueueImpl {
    /** @type {Node | undefined} */
    #head;
    /** @type {Node | undefined} */
    #tail;
    #size = 0;

    enqueue(value) {
        const node = new Node(value);

        if (this.#head) {
            this.#tail.next = node;
            this.#tail = node;
        } else {
            this.#head = node;
            this.#tail = node;
        }

        this.#size++;
    }

    dequeue() {
        const current = this.#head;
        if (!current) {
            return;
        }

        this.#head = current.next;
        this.#size--;
        return current.value;
    }

    peek() {
        return this.#head?.value;
    }

    clear() {
        this.#head = undefined;
        this.#tail = undefined;
        this.#size = 0;
    }

    get size() {
        return this.#size;
    }

    *[Symbol.iterator]() {
        let current = this.#head;
        while (current) {
            yield current.value;
            current = current.next;
        }
    }
}

/**
 * yocto-queueの実装をTypeScriptに移植したものを返す
 * @returns Queue<T>のインスタンス
 */
module.exports = function Queue2() {
    return new QueueImpl();
};
