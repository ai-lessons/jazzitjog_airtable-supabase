export type AnyRow = Record<string, any>;
/** Возвращает значение ключа из row или row.fields (без учета регистра/пробелов/подчёркиваний) */
export declare function getField(row: AnyRow, key: string): any;
/** Берёт первое непустое значение по списку кандидатов, ищет в row и row.fields */
export declare function pickFirst(row: AnyRow, candidates: string[], fallback?: any): any;
//# sourceMappingURL=picker.d.ts.map