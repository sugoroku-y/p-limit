declare global {
    /**
     * TのinterfaceをdefinePropertiesで定義するために必要なPropertyDescriptorMapを返します。
     */
    type PropertyDescriptorMapOf<T extends object> = {
        readonly [K in keyof T]: StrictPropertyDescriptor<
            T[K],
            IsReadonlyProperty<T, K>
        >;
    };

    interface ObjectConstructor {
        defineProperty<
            Target extends object,
            Key extends PropertyKey,
            Descriptor extends PropertyDescriptor,
        >(
            target: Target,
            propertyKey: Key,
            descriptor: Descriptor,
        ): Target & TypeOfPropertyDescriptorMap<Record<Key, Descriptor>>;
        defineProperties<
            Target extends object,
            PropertyMap extends PropertyDescriptorMap,
        >(
            target: Target,
            properties: PropertyMap,
        ): Target & TypeOfPropertyDescriptorMap<PropertyMap>;
    }
}

type Equal<A, B> =
    (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B ? 1 : 0
        ? true
        : false;
type IsVoid<T> = Equal<T, void>;
type IsNever<T> = [T] extends [never] ? true : false;

type IsReadonlyProperty<
    Target extends object,
    Key extends keyof Target,
> = Equal<Pick<Target, Key>, Readonly<Pick<Target, Key>>>;

/**
 * アクセサー(setter/getter)を持つプロパティのためのプロパティ記述子です。
 * @template T プロパティの型
 * @template Readonly 参照専用のプロパティの場合にはtrueを指定します。
 */
type AccessorPropertyDescriptor<
    T = void,
    Readonly extends boolean = never,
    Getter = IsVoid<T> extends true ? () => unknown : () => T,
    Setter = IsVoid<T> extends true ? (v: never) => void : (v: T) => void,
> = Omit<
    Omit<PropertyDescriptor, 'get' | 'set' | 'value' | 'writable'> & {
        // getが未指定でもエラーにはならないが、レアケースのため考慮に入れない。
        get: Getter;
    } & (true extends Readonly
            ? unknown
            : false extends Readonly
              ? { set: Setter }
              : { set?: Setter }),
    never
>;
/**
 * データを保持するプロパティのためのプロパティ記述子です。
 * @template T プロパティの型
 * @template Readonly 参照専用のプロパティの場合にはtrueを指定します。
 */
type DataPropertyDescriptor<
    T = void,
    Readonly extends boolean = never,
    Value = IsVoid<T> extends true ? unknown : T,
> = Omit<
    Omit<PropertyDescriptor, 'get' | 'set' | 'value' | 'writable'> & {
        // valueの指定がなくてもエラーにはならないが、型が確定できなくなるので考慮に入れない。
        value: Value;
    } & (true extends Readonly
            ? { writable?: false }
            : false extends Readonly
              ? { writable: true }
              : { writable?: boolean }),
    never
>;

/**
 * Tに指定したinterfaceが持つプロパティのうち不要なものを指定できないようにします。
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
 * type AB = A | B | PreventUnnecessaryPropertiesOf<A & B>;
 *
 * const a: AB = {
 *     a1: 'abc',
 *     a2: 123,
 *     b1: 345,
 * //  ^^ オブジェクト リテラルは既知のプロパティのみ指定できます。'b1' は型 'A' に存在しません。
 * };
 *
 * type LooseAB = A | B;
 * const a2: LooseAB = {
 *     a1: 'abc',
 *     a2: 123,
 *     b1: 345, // no error
 * };
 */
type PreventUnnecessaryPropertiesOf<T> = {
    [K in keyof T]: Record<K, never> &
        Partial<Record<Exclude<keyof T, K>, never>>;
}[keyof T];

/**
 * 指定の型のプロパティを実装するための厳密なプロパティ記述子です。
 * @template T プロパティの型
 * @template Readonly 参照専用のプロパティの場合にはtrueを指定します。
 */
type StrictPropertyDescriptor<T = void, Readonly extends boolean = never> =
    | AccessorPropertyDescriptor<T, Readonly>
    | DataPropertyDescriptor<T, Readonly>
    | PreventUnnecessaryPropertiesOf<PropertyDescriptor>;

/**
 * 適切なPropertyDescriptorかどうかを判別する。
 */
type IsValidPropertyDescriptor<D extends PropertyDescriptor> =
    D extends StrictPropertyDescriptor ? true : false;

/**
 * 適切なPropertyDescriptorMapかどうかを判別する。
 */
type IsValidPropertyDescriptorMap<Map extends PropertyDescriptorMap> = IsNever<
    keyof {
        [K in keyof Map as IsValidPropertyDescriptor<Map[K]> extends true
            ? never
            : K]: 1;
    }
>;

/**
 * 参照専用のプロパティ向けのPropertyDescriptorかどうかを判別する。
 */
type IsReadonlyPropertyDescriptor<D extends PropertyDescriptor> =
    // Setterがあればwritable
    D extends { set: unknown }
        ? false
        : // SetterがなくてGetterがあればreadonly
          D extends { get: unknown }
          ? true
          : // writableが指定されていて...
            D extends { writable?: infer Writable }
            ? // true、もしくはbooleanであればwritable、でなければreadonly
              true extends Writable
                ? false
                : true
            : // writableが指定されていなければreadonly
              true;

/**
 * PropertyDescriptorで実装されるプロパティの型を返す。
 */
type TypeOfPropertyDescriptor<D extends PropertyDescriptor> =
    D extends TypedPropertyDescriptor<infer R> ? R : never;

/**
 * PropertyDescriptorMapで実装されるプロパティの型を返す。
 */
type TypeOfPropertyDescriptorMap<D extends PropertyDescriptorMap> =
    IsValidPropertyDescriptorMap<D> extends true
        ? // 変更可能なプロパティ
          {
              -readonly [K in keyof D as IsReadonlyPropertyDescriptor<
                  D[K]
              > extends true
                  ? never
                  : K]: TypeOfPropertyDescriptor<D[K]>;
          } & {
              // 参照専用のプロパティ
              readonly [K in keyof D as IsReadonlyPropertyDescriptor<
                  D[K]
              > extends true
                  ? K
                  : never]: TypeOfPropertyDescriptor<D[K]>;
          }
        : never;

export {};
