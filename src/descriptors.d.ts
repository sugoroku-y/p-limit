/**
 * TのinterfaceをdefinePropertiesで定義するために必要なPropertyDescriptorMapを返します。
 */
export type PropertyDescriptorMapOf<T extends object> = {
    readonly [K in keyof T]: StrictPropertyDescriptor<
        T[K],
        IsReadonlyProperty<T, K>
    >;
};

/**
 * 指定の型のプロパティを実装するための厳密なプロパティ記述子です。
 * @template T プロパティの型
 * @template Readonly 参照専用のプロパティの場合にはtrueを指定します。
 */
export type StrictPropertyDescriptor<
    T,
    Readonly extends boolean = boolean,
> = PreventPropertyOfAnotherType<
    | AccessorPropertyDescriptor<T, Readonly>
    | DataPropertyDescriptor<T, Readonly>
>;

/**
 * アクセサー(setter/getter)を持つプロパティのためのプロパティ記述子です。
 * @template T プロパティの型
 * @template Readonly 参照専用のプロパティの場合にはtrueを指定します。
 */
export type AccessorPropertyDescriptor<
    T,
    Readonly extends boolean = boolean,
> = Omit<
    Omit<PropertyDescriptor, 'get' | 'set' | 'value' | 'writable'> &
        // getが未指定でもエラーにはなりませんが、() => undefinedを指定しているのと同じなので指定必須とします。
        Required<Pick<TypedPropertyDescriptor<T>, 'get'>> &
        (boolean extends Readonly
            ? // Readonlyの省略時(boolean指定時)はSetter省略可
              Pick<TypedPropertyDescriptor<T>, 'set'>
            : false extends Readonly
              ? // 変更可の場合はSetter指定必須
                Required<Pick<TypedPropertyDescriptor<T>, 'set'>>
              : // 参照専用の場合はSetter指定禁止
                unknown),
    never
>;

/**
 * データを保持するプロパティのためのプロパティ記述子です。
 * @template T プロパティの型
 * @template Readonly 参照専用のプロパティの場合にはtrueを指定します。
 */
export type DataPropertyDescriptor<
    T,
    Readonly extends boolean = boolean,
> = Omit<
    Omit<PropertyDescriptor, 'get' | 'set' | 'value' | 'writable'> &
        // valueの指定がなくてもエラーにはなりませんが、undefinedを指定しているのと同じなので指定必須とします。
        Required<Pick<TypedPropertyDescriptor<T>, 'value'>> &
        // 参照専用の場合はwritableは指定しないか、falseのみ指定可
        (| (true extends Readonly ? { writable?: false } : never)
            // 変更可の場合はwritableにtrueの指定必須
            | (false extends Readonly ? { writable: true } : never)
        ),
    // Readonlyの省略時(boolean指定時)は上記のUnionとなり{ writable?: boolean }となります
    never
>;

/**
 * Tに指定したinterfaceのUnion型のうち他のinterfaceが持つプロパティを指定できないようにします。
 * @template T interfaceのUnion型を指定します。
 * @example
 * interface A {
 *     a1: string;
 *     a2: number;
 * }
 * interface B {
 *     b1: number;
 *     b2: string;
 * }
 *
 * const a: A | B = {
 *     a1: 'abc',
 *     a2: 123,
 *     b1: 345, // 単純なUnion型だとAにBのプロパティが混ざっていてもエラーになりません
 * };
 *
 * const a2: PreventPropertyOfAnotherType<A | B> = {
 *     a1: 'abc',
 *     a2: 123,
 *     b1: 345,
 * //  ^^ オブジェクト リテラルは既知のプロパティのみ指定できます。'b1' は型 'A' に存在しません。
 * };
 */
type PreventPropertyOfAnotherType<T> =
    | T
    // 他の型が持つプロパティの所持を禁止します
    | Unexistent<Partial<Record<T extends T ? keyof T : never, never>>>; // 空オブジェクトに合致しないように存在しないオブジェクト型にします

/** 存在しないシンボル */
declare const absence: unique symbol;

/**
 * 型としても実体としても存在しない型にする型関数。
 *
 * absenceはexportしていないので外部からは参照することもできず、型として存在できません。
 *
 * 存在しないシンボルをキー名にした必須プロパティを持つので実体化もできません。
 */
type Unexistent<T> = T & { [absence]: never };

type IsReadonlyProperty<
    Target extends object,
    Key extends keyof Target,
> = Equal<Pick<Target, Key>, Readonly<Pick<Target, Key>>>;

type Equal<A, B> =
    (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B ? 1 : 0
        ? true
        : false;
