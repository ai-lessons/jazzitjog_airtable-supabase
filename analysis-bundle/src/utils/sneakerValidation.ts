// src/utils/sneakerValidation.ts
/**
 * Validation rules to ensure only sneakers/running shoes get into the database
 */

// Keywords that indicate non-sneaker items (jackets, accessories, etc.)
const NON_SNEAKER_KEYWORDS = new Set([
  // Clothing
  'jacket', 'куртка', 'shirt', 'рубашка', 'hoodie', 'худи', 'sweater', 'свитер',
  'pants', 'штаны', 'shorts', 'шорты', 'tights', 'леггинсы', 'vest', 'жилет',
  'cap', 'кепка', 'hat', 'шляпа', 'beanie', 'шапка', 'gloves', 'перчатки',

  // Accessories
  'watch', 'часы', 'belt', 'ремень', 'bag', 'сумка', 'backpack', 'рюкзак',
  'sock', 'носки', 'socks', 'носки', 'insole', 'стелька', 'insoles', 'стельки',
  'laces', 'шнурки', 'cleaner', 'очиститель', 'spray', 'спрей',

  // Equipment
  'treadmill', 'беговая дорожка', 'tracker', 'трекер', 'monitor', 'монитор',
  'headphones', 'наушники', 'earbuds', 'наушники', 'bottle', 'бутылка',

  // Specific non-shoe items
  'flrjacket', 'windbreaker', 'ветровка', 'raincoat', 'дождевик',
  'compression', 'компрессионная', 'sleeve', 'рукав', 'band', 'повязка'
]);

// Keywords that indicate sneakers/running shoes
const SNEAKER_KEYWORDS = new Set([
  'shoe', 'shoes', 'кроссовки', 'кроссовок', 'sneaker', 'sneakers',
  'runner', 'running', 'беговые', 'trainer', 'тренировочные',
  'boot', 'ботинки', 'sandal', 'сандали', 'flip', 'шлепки',
  'клипы', 'spikes', 'шиповки', 'cleats', 'бутсы'
]);

/**
 * Check if a model name indicates a non-sneaker item
 */
export function isNonSneakerItem(modelName: string): boolean {
  if (!modelName || typeof modelName !== 'string') return true;

  const normalized = modelName.toLowerCase().trim();

  // Check for non-sneaker keywords
  for (const keyword of NON_SNEAKER_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a model name indicates a sneaker
 */
export function isSneakerItem(modelName: string): boolean {
  if (!modelName || typeof modelName !== 'string') return false;

  const normalized = modelName.toLowerCase().trim();

  // First check if it's explicitly a non-sneaker
  if (isNonSneakerItem(normalized)) {
    return false;
  }

  // Check for sneaker keywords
  for (const keyword of SNEAKER_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return true;
    }
  }

  // Default patterns that suggest footwear
  const footwearPatterns = [
    /\d+(\.\d+)?\s*(mm|мм)\s*(drop|дроп)/i, // drop measurement
    /\d+(\.\d+)?\s*(mm|мм)\s*(heel|пятка)/i, // heel height
    /\d+(\.\d+)?\s*(g|гр|gram|грамм)/i, // weight in grams (typical for shoes)
    /(air|gel|boost|zoom|react|dna|fresh|foam)/i, // cushioning tech
    /(trail|road|track|racing|daily)/i, // running categories
  ];

  return footwearPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Validate that an item should be included in sneaker database
 */
export function shouldIncludeInSneakerDB(brandName: string, modelName: string): boolean {
  // Must have valid brand and model
  if (!brandName || !modelName) return false;

  // Exclude non-sneaker items
  if (isNonSneakerItem(modelName)) {
    return false;
  }

  // Include if it's clearly a sneaker or if brand is known sneaker brand
  const knownSneakerBrands = new Set([
    'nike', 'adidas', 'asics', 'brooks', 'saucony', 'hoka', 'new balance',
    'mizuno', 'puma', 'reebok', 'salomon', 'altra', 'topo athletic',
    'on', 'allbirds', 'vans', 'converse', 'jordan'
  ]);

  const normalizedBrand = brandName.toLowerCase().trim();

  // If it's a known sneaker brand, be more permissive
  if (knownSneakerBrands.has(normalizedBrand)) {
    return !isNonSneakerItem(modelName);
  }

  // For unknown brands, require explicit sneaker indicators
  return isSneakerItem(modelName);
}