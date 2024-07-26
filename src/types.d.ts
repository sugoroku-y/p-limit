declare global {
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

/**
 * PropertyDescriptorMapで実装されるプロパティの型を返す。
 */
type TypeOfPropertyDescriptorMap<D extends PropertyDescriptorMap> =
    // 変更可能なプロパティ
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
    };

/**
 * PropertyDescriptorで実装されるプロパティの型を返す。
 */
type TypeOfPropertyDescriptor<D extends PropertyDescriptor> =
    D extends TypedPropertyDescriptor<infer R> ? R : never;

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

export {};
