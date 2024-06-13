/** `limit`関数 */
export interface LimitFunction {
    /**
     * タスクをpLimitで指定された並列実行最大数に制限して実行します。
     * @template Parameters タスクに渡される引数の型です。
     * @template ReturnType タスクが返す返値の型です。
     * @param task 実行するタスクを指定します。
     * @param parameters タスクに渡される引数を指定します。
     * @returns タスクの実行が完了したらタスクの返値を返すPromiseを返します。
     */
    <Parameters extends unknown[], ReturnType>(task: (...parameters: Parameters) => PromiseLike<ReturnType>, ...parameters: Parameters): Promise<ReturnType>;
    /** 現在同時実行中のタスクの数 */
    readonly activeCount: number;
    /** 現在実行待機中のタスクの数 */
    readonly pendingCount: number;
    /**
     * 現在実行待機中のタスクをクリアして実行開始しないようにします。
     *
     * すでに実行開始済のタスクには何もしません。
     */
    clearQueue(): void;
}
/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrency 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
export default function pLimit(concurrency: number): LimitFunction;
