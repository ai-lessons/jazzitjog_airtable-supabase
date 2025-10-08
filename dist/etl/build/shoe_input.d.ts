import type { SneakerSpec } from '../../llm/types';
import type { BuildContext, BuildResult } from './types';
/**
 * Build ShoeInput from normalized SneakerSpec
 */
export declare function buildShoeInput(sneaker: SneakerSpec, context: BuildContext): BuildResult;
/**
 * Build multiple ShoeInputs
 */
export declare function buildShoeInputs(sneakers: SneakerSpec[], context: BuildContext): BuildResult[];
//# sourceMappingURL=shoe_input.d.ts.map