declare global {
    /**
     * TのinterfaceをdefinePropertiesで定義するために必要なPropertyDescriptorMapを返します。
     */
    type TypedStrictPropertyDescriptorMap<T extends object> = {
        readonly [K in keyof T]: IsReadonlyProperty<T, K> extends true
            ?
                  | ValuePropertyDescriptor<T[K], false>
                  | GetterOnlyPropertyDescriptor<T[K]>
            :
                  | ValuePropertyDescriptor<T[K], true>
                  | AccessorPropertyDescriptor<T[K]>;
    };

    interface ObjectConstructor {
        /**
         * オブジェクトにプロパティを追加したり、既存のプロパティの属性を変更したりします。
         * @param target プロパティを追加または変更するオブジェクト。
         * @param propertyKey 追加または変更するプロパティのキー。
         * @param descriptor 追加または変更するプロパティの記述子オブジェクト。
         * @returns プロパティが追加・変更された`target`そのものを返します。
         */
        defineProperty<
            Target extends object,
            Key extends PropertyKey,
            Descriptor extends StrictPropertyDescriptor,
        >(
            target: Target,
            propertyKey: Key,
            descriptor: Descriptor,
        ): Target & TypeOfStrictPropertyDescriptorMap<Record<Key, Descriptor>>;
        /**
         * オブジェクトにプロパティを追加したり、既存のプロパティの属性を変更したりします。
         * @param target プロパティを追加または変更するオブジェクト。
         * @param properties 1つ以上の記述子オブジェクトを含むJavaScriptオブジェクト。各ディスクリプタオブジェクトは、データプロパティまたはアクセサプロパティを記述します。
         * @returns プロパティが追加・変更された`target`そのものを返します。
         */
        defineProperties<
            Target extends object,
            PropertyMap extends StrictPropertyDescriptorMap,
        >(
            target: Target,
            properties: PropertyMap,
        ): Target & TypeOfStrictPropertyDescriptorMap<PropertyMap>;
    }
}

type TypeOfStrictPropertyDescriptorMap<D extends StrictPropertyDescriptorMap> =
    {
        -readonly [K in keyof D as IsReadonlyPropertyDescriptor<
            D[K]
        > extends false
            ? K
            : never]: TypeOfPropertyDescriptor<D[K]>;
    } & {
        readonly [K in keyof D as IsReadonlyPropertyDescriptor<
            D[K]
        > extends true
            ? K
            : never]: TypeOfPropertyDescriptor<D[K]>;
    };

type GetterOnlyPropertyDescriptor<T = never> = Omit<
    Omit<PropertyDescriptor, 'get' | 'set' | 'value' | 'writable'> & {
        get: () => [T] extends [never] ? unknown : T;
        set?: never;
        value?: never;
        writable?: never;
    },
    never
>;
type AccessorPropertyDescriptor<T = never> = Omit<
    Omit<PropertyDescriptor, 'get' | 'set' | 'value' | 'writable'> & {
        get?: () => [T] extends [never] ? unknown : T;
        set: (newValue: T) => void;
        value?: never;
        writable?: never;
    },
    never
>;
type ValuePropertyDescriptor<
    T = never,
    Writable extends boolean = never,
> = Omit<
    Omit<PropertyDescriptor, 'get' | 'set' | 'value' | 'writable'> & {
        get?: never;
        set?: never;
        value: [T] extends [never] ? unknown : T;
    } & (true extends Writable
            ? { writable: true }
            : false extends Writable
              ? { writable?: false }
              : { writable?: boolean }),
    never
>;

type StrictPropertyDescriptor =
    | AccessorPropertyDescriptor
    | GetterOnlyPropertyDescriptor
    | ValuePropertyDescriptor;
type StrictPropertyDescriptorMap = Record<
    PropertyKey,
    StrictPropertyDescriptor
>;
type IsReadonlyPropertyDescriptor<D extends PropertyDescriptor> = D extends {
    get: () => unknown;
}
    ? D extends { set: (v: never) => void }
        ? false
        : true
    : D extends { value: unknown }
      ? D extends { writable: true }
          ? false
          : true
      : false;
type TypeOfPropertyDescriptor<D extends PropertyDescriptor> =
    D extends TypedPropertyDescriptor<infer R> ? R : never;

type IsReadonlyProperty<
    Target extends object,
    Key extends keyof Target,
> = Equal<Pick<Target, Key>, Readonly<Pick<Target, Key>>>;

type Equal<A, B> =
    (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B ? 1 : 0
        ? true
        : false;

export {};
