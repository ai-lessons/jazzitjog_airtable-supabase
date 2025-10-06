/**
 * Примеры:
 * "Shoe That's Stable and Fun? Yep, the Asics GT-2000 14 Delivers Both"
 *    → brand="Asics", model="GT-2000"
 * "Nils’s Puma Fast-R Nitro 3 In Depth"            → brand="Puma",        model="Fast-R Nitro 3"
 * "Kurt's Mizuno Wave Sky 9 Review"                → brand="Mizuno",      model="Wave Sky 9"
 * "Li Ning Feidian 5 Elite Review"                 → brand="Li-Ning",     model="Feidian 5 Elite"
 * "Beoordeling: New Balance SC Elite V5: …"        → brand="New Balance", model="SC Elite V5"
 * "Test des Mount to Coast T1 – …"                 → brand="Mount to Coast", model="T1"
 */
export declare function brandModelFromTitle(rawTitle: string): {
    brand: string | null;
    model: string | null;
    confidence: number;
};
//# sourceMappingURL=brandModelFromTitle.d.ts.map