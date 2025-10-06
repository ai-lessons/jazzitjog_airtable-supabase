/**
 * Validation rules to ensure only sneakers/running shoes get into the database
 */
/**
 * Check if a model name indicates a non-sneaker item
 */
export declare function isNonSneakerItem(modelName: string): boolean;
/**
 * Check if a model name indicates a sneaker
 */
export declare function isSneakerItem(modelName: string): boolean;
/**
 * Validate that an item should be included in sneaker database
 */
export declare function shouldIncludeInSneakerDB(brandName: string, modelName: string): boolean;
//# sourceMappingURL=sneakerValidation.d.ts.map