declare global {
    /**
     * TのinterfaceをdefinePropertiesで定義するために必要なPropertyDescriptorMapを返します。
     */
    type TypedPropertyDescriptorMap<T extends object> = {
        readonly [K in keyof T]: TypedPropertyDescriptor<T[K]>;
    };

    interface ObjectConstructor {
        /**
         * オブジェクトにプロパティを追加したり、既存のプロパティの属性を変更したりします。
         * @param target プロパティを追加または変更するオブジェクト。
         * @param properties 1つ以上の記述子オブジェクトを含むJavaScriptオブジェクト。各ディスクリプタオブジェクトは、データプロパティまたはアクセサプロパティを記述します。
         * @returns プロパティが追加・変更された`target`そのものを返します。
         */
        defineProperties<
            Target extends object,
            PropertyMap extends PropertyDescriptorMap,
        >(
            target: Target,
            properties: PropertyMap,
        ): Target & {
            [K in keyof PropertyMap]: PropertyMap[K] extends TypedPropertyDescriptor<
                infer R
            >
                ? R
                : never;
        };
    }
}

export {};
