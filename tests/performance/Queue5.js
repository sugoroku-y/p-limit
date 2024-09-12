/**
 * 配列と1方向リンクリストを使用したキュー
 *
 * unshiftはコストが高いので先頭のインデックスを増やしていく。
 * @template T
 * @param {number} [blockSizeSpec] キューで使用する配列の最大サイズ
 * @returns {Queue<T>} Queue<T>のインスタンス
 */
module.exports = function Queue5(blockSizeSpec) {
    /** @typedef {T[] & {next?: Node | undefined}} Node */

    /** @type {Node}} */
    let head;
    /** @type {number}} */
    let headIndex;
    /** @type {Node}} */
    let tail;
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

    /**
     * キューに値を追加する。
     * @param {T} value 追加する値
     */
    function enqueue(value) {
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
        head[headIndex] = undefined;

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
        // キューが空の場合はhead.length===0&&headIndex===0なのでundefinedを返します
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
};

const BLOCK_MAX_COUNT = 0x100000;
