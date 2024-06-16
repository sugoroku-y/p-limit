# @sugoroku-y/p-limit

The another [p-limit](https://github.com/sindresorhus/p-limit).

もうひとつの[p-limit](https://github.com/sindresorhus/p-limit)。

[![TypeScript](https://img.shields.io/badge/-TypeScript-404040.svg?logo=TypeScript)](https://www.typescriptlang.org/) [![JavaScript](https://img.shields.io/badge/-JavaScript-404040.svg?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) [![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsugoroku-y%2Fp-limit%2Fmain%2Fpackage.json&query=%24.version&prefix=v&logo=GitHub&label=GitHub%20Packages&link=https%3A%2F%2Fimg.shields.io%2Fbadge%2Flicense-MIT-blue.svg%3Fstyle%3Dflat)
](https://github.com/sugoroku-y/p-limit/pkgs/npm/p-limit) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](./LICENSE) [![Coverage Status](https://coveralls.io/repos/github/sugoroku-y/p-limit/badge.svg)](https://coveralls.io/github/sugoroku-y/p-limit) [![Publish package to GitHub Packages](https://github.com/sugoroku-y/p-limit/actions/workflows/publish.yml/badge.svg)](https://github.com/sugoroku-y/p-limit/actions/workflows/publish.yml) [![Push Coverage to Coveralls](https://github.com/sugoroku-y/p-limit/actions/workflows/coverage.yml/badge.svg)](https://github.com/sugoroku-y/p-limit/actions/workflows/coverage.yml)

## Difference

The implementation of [p-limit](https://github.com/sindresorhus/p-limit) has been simplified to eliminate the asynchronous context switching and the call to `AsyncResource.bind`, making it a bit lighter.

[p-limit](https://github.com/sindresorhus/p-limit)の実装を単純化して非同期コンテキストの切り替えをなくし`AsyncResource.bind`の呼び出しを不要にしたことでちょっとだけ軽量化を実現しています。

## Install

Execute the following command.

以下のコマンドを実行してください。

```bash
npm install sugoroku-y/p-limit
```

## Usage

First, import `p-limit`.

まず、`p-limit`をimportします。

```ts
import pLimit from '@sugoroku-y/p-limit';
```

Next, call `pLimit` to generate a `limit` function, specifying the maximum number of parallel executions.

次に、並列実行する最大数を指定して`pLimit`を呼び出し`limit`関数を生成します。

```ts
const limit = pLimit(5);
```

Then, pass to the `limit` function the function to be executed and the arguments to be passed to it.

あとは実行する関数とそれに渡す引数を`limit`関数に渡してやるだけです。

```ts
await Promise.all(tasks.map((task) => limit(() => task.execute())));
```

## API

```ts
/**
 * 並列実行するタスクを指定した値で制限する`limit`関数を生成します。
 * @param concurrency 並列実行する最大数を指定します。
 *
 * 1以上の数値を指定できます。
 * @returns 生成した`limit`関数を返します。
 * @throws concurrencyに不正な値(数値以外や1未満の数値)を指定したときに例外を投げます。
 */
export default function pLimit(concurrency: number): LimitFunction;

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
  <Parameters extends unknown[], ReturnType>(
    task: (...parameters: Parameters) => PromiseLike<ReturnType>,
    ...parameters: Parameters
  ): Promise<ReturnType>;

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
```

## License

Copyright YEBISUYA Sugoroku 2024. Licensed MIT.
