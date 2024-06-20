declare global {
    type TypedPropertyDescriptors<T extends object> = {
        readonly [K in keyof T]: TypedPropertyDescriptor<T[K]>;
    };

    interface ObjectConstructor {
        defineProperties<T extends object, Descriptors extends object>(
            o: T,
            descriptors: Descriptors,
        ): T & {
            [Key in keyof Descriptors]: Descriptors[Key] extends TypedPropertyDescriptor<
                infer R
            >
                ? R
                : never;
        };
    }
}

export {};
