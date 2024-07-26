import type {
    PreventPropertyOfAnotherType,
    PropertyDescriptorMapOf,
} from '../src/descriptors';

// eslint-disable-next-line jest/no-disabled-tests -- -
describe.skip('descriptors', () => {
    interface A {
        a: string;
    }
    interface A2 {
        a: string[];
    }
    interface B {
        b: number;
    }
    interface C {
        c?: boolean | undefined;
    }
    test('PropertyDescriptorMapOf', () => {
        const o: unknown[] = [
            Object.defineProperties({}, {
                a: { get: () => 'abc', set: () => {} },
            } satisfies PropertyDescriptorMapOf<A>) satisfies A,
            Object.defineProperties({}, {
                a: { value: 'abc', writable: true },
            } satisfies PropertyDescriptorMapOf<A>) satisfies A,
            Object.defineProperties({}, {
                a: { get: () => 'abc' },
            } satisfies PropertyDescriptorMapOf<
                Readonly<A>
            >) satisfies Readonly<A>,
            Object.defineProperties({}, {
                a: { value: 'abc' },
            } satisfies PropertyDescriptorMapOf<
                Readonly<A>
            >) satisfies Readonly<A>,
            Object.defineProperties({}, {
                a: {
                    get: () => 'abc',
                    // @ts-expect-error -- getが指定されていたらvalueは指定禁止
                    value: 'abc',
                },
            } satisfies PropertyDescriptorMapOf<A>),
            Object.defineProperties({}, {
                a: {
                    get: () => 'abc',
                    // @ts-expect-error -- getが指定されていたらwritableは指定禁止
                    writable: true,
                },
            } satisfies PropertyDescriptorMapOf<A>),
            Object.defineProperties({}, {
                a: {
                    value: 'abc',
                    // @ts-expect-error -- valueが指定されていたらgetは指定禁止
                    get: () => 'abc',
                },
            } satisfies PropertyDescriptorMapOf<A>),
            Object.defineProperties({}, {
                a: {
                    value: 'abc',
                    // @ts-expect-error -- valueが指定されていたらsetは指定禁止
                    set: () => {},
                },
            } satisfies PropertyDescriptorMapOf<A>),
            Object.defineProperties({}, {
                a: {
                    get: () => 'abc',
                    // @ts-expect-error -- readonlyなプロパティではsetは指定禁止
                    set: () => {},
                },
            } satisfies PropertyDescriptorMapOf<Readonly<A>>),
            Object.defineProperties({}, {
                a: {
                    value: 'abc',
                    // @ts-expect-error -- readonlyなプロパティではwritableにtrueを指定禁止
                    writable: true,
                },
            } satisfies PropertyDescriptorMapOf<Readonly<A>>),
            Object.defineProperties({}, {
                // @ts-expect-error -- readonlyでないプロパティではwritable指定必須
                a: {
                    value: 'abc',
                },
            } satisfies PropertyDescriptorMapOf<A>),
            Object.defineProperties({}, {
                a: {
                    value: 'abc',
                    // @ts-expect-error -- readonlyでないプロパティではwritableにtrueを指定必須
                    writable: false,
                },
            } satisfies PropertyDescriptorMapOf<A>),
            Object.defineProperties({}, {
                // @ts-expect-error -- {}は指定不可
                a: {},
            } satisfies PropertyDescriptorMapOf<A>),
        ];
        expect(typeof o).toBe('object');
    });
    test('PreventPropertyOfAnotherType', () => {
        const ab: PreventPropertyOfAnotherType<A | B>[] = [
            // それぞれのプロパティだけならエラーにならない
            {
                a: 'abc',
            },
            {
                b: 123,
            },
            // エラーになるパターン
            {
                a: 'abc',
                // @ts-expect-error -- PreventPropertyOfAnotherTypeでエラーになるはず
                b: 123,
            },
            {
                b: 123,
                // @ts-expect-error -- 同じ内容でも書く順番でエラーになるプロパティが変わる
                a: 'abc',
            },
            {
                b: 123,
                // @ts-expect-error -- 当然AにもBにもないプロパティでもエラーになる
                c: 'abc',
            },
            // @ts-expect-error -- 空オブジェクトはAにもBにも合致しないのでエラー
            {},
        ];
        const ac: PreventPropertyOfAnotherType<A | C>[] = [
            // それぞれのプロパティだけならエラーにならない
            {
                a: 'abc',
            },
            {
                c: true,
            },
            // Cはプロパティの省略可なので空オブジェクトも許容される
            {},
            // エラーになるパターン
            {
                a: 'abc',
                // @ts-expect-error -- PreventPropertyOfAnotherTypeでエラーになるはず
                c: true,
            },
            {
                c: true,
                // @ts-expect-error -- 同じ内容でも書く順番でエラーになるプロパティが変わる
                a: 'abc',
            },
            {
                c: true,
                // @ts-expect-error -- 当然AにもCにもないプロパティでもエラーになる
                b: 123,
            },
        ];
        const abAc: PreventPropertyOfAnotherType<(A & B) | (A2 & C)>[] = [
            // それぞれのプロパティだけならエラーにならない
            { a: 'abc', b: 123 },
            { a: ['abc'], c: true },
            // cは省略可
            { a: ['abc'] },
            // エラーになるパターン: 存在不可なプロパティはそのプロパティのみがエラー
            {
                a: ['abc'],
                // @ts-expect-error -- aが配列なのでA2 & Cと見なされbは存在不可
                b: 123,
            },
            {
                a: 'abc',
                // @ts-expect-error -- aが文字列なのでA & Bと見なされcは存在不可
                c: true,
            },
            // エラーになるパターン: 必須プロパティが不足していたり、プロパティの型が違う場合はオブジェクト全体がエラー
            // @ts-expect-error -- bが存在しているのでA & Bと見なされaは必須
            { b: 123 },
            // @ts-expect-error -- cが存在しているのでA2 & Cと見なされaは必須
            { c: true },
            // @ts-expect-error -- bが存在しているのでA & Bと見なされaは文字列でないと不可
            { b: 123, a: ['abc'] },
            // @ts-expect-error -- cが存在しているのでA2 & Cと見なされaは文字列の配列でないと不可
            { c: true, a: 'abc' },
            // @ts-expect-error -- aが文字列なのでA & Bと見なされbは必須
            { a: 'abc' },
            // @ts-expect-error -- 空オブジェクトは許容されない
            {},
        ];
        expect(typeof ab).toBe('object');
        expect(typeof ac).toBe('object');
        expect(typeof abAc).toBe('object');
    });
});
