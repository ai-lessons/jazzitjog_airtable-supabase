/** Строгая структура для апсерта в БД */
export type ShoeInput = {
    article_id: number;
    record_id: string | null;
    brand_name: string;
    model: string;
    model_key: string;
    upper_breathability: string | null;
    carbon_plate: boolean | null;
    waterproof: boolean | null;
    heel_height: number | null;
    forefoot_height: number | null;
    drop: number | null;
    weight: number | null;
    price: number | null;
    primary_use: string | null;
    cushioning_type: string | null;
    surface_type: string | null;
    foot_width: string | null;
    additional_features: string | null;
    date: string | null;
    source_link: string | null;
};
/** Релакс-форма (для промежуточных шагов/старого кода) */
export type ShoeInputLoose = Partial<ShoeInput> & {
    brand_name?: string;
    model?: string;
    record_id?: string | null;
    article_id?: number | string | null;
};
/** То, что читаем/пишем в таблицу (суместимость) */
export type ShoeRow = ShoeInput;
/** Уточняет название модели */
export declare function refineModelName(brand: string, model: string): string;
/** Строит ключ модели в формате "brand::model" */
export declare function makeModelKey(brand: string, model: string): string;
/** Приводит Loose-вход к строгому ShoeInput */
export declare function tightenInput(loose: ShoeInputLoose): ShoeInput | null;
/** Массовая нормализация для массивов loose-объектов */
export declare function normalizeAll(list: ShoeInputLoose[]): ShoeInput[];
//# sourceMappingURL=fields.d.ts.map