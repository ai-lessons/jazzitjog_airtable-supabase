// Build module types

import type { ShoeInput } from '../../core/types';

/**
 * Build context - article metadata
 */
export type BuildContext = {
  article_id: number;
  record_id?: string | null;
  date?: string | null;
  source_link?: string | null;
};

/**
 * Result of building ShoeInput
 */
export type BuildResult = {
  shoe: ShoeInput;
  model_key: string;
  warnings: string[];
};
