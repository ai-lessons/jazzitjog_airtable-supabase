import OpenAI from "openai";

export interface SneakerData {
  brand: string;
  model: string;
  use?: string;
  surface?: "road" | "trail";
  heel?: number;
  forefoot?: number;
  drop?: number;
  weight?: number;
  price?: number;
  plate?: boolean;
  waterproof?: boolean;
  cushioning?: "firm" | "balanced" | "max";
  width?: "narrow" | "standard" | "wide";
  breathability?: "low" | "medium" | "high";
  date?: string;
  source?: string;
}

export interface ProcessedArticle {
  article_id: number;
  record_id: string;
  title: string;
  content: string;
  date?: string;
  source_link?: string;
  sneakers: SneakerData[];
}

export interface TitleAnalysis {
  scenario: 'specific' | 'general' | 'brand-only' | 'irrelevant';
  brand?: string;
  model?: string;
  confidence: number;
}

export class SimpleSneakerParser {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async parseArticle(data: {
    article_id: number;
    record_id: string;
    title: string;
    content: string;
    date?: string;
    source_link?: string;
  }): Promise<ProcessedArticle> {
    // Step 1: Analyze title to determine extraction strategy
    const titleAnalysis = this.analyzeTitle(data.title);

    // Step 2: Extract sneakers based on title analysis
    const sneakers = await this.extractSneakers(
      data.content,
      data.title,
      titleAnalysis,
      data.date,
      data.source_link
    );

    return {
      ...data,
      sneakers,
    };
  }

  analyzeTitle(title: string): TitleAnalysis {
    const cleanTitle = title.trim();

    // Filter out non-shoe articles (headphones, watches, accessories, etc.)
    const nonShoePatterns = [
      /headphone/i,
      /earbuds?/i,
      /watch(es)?/i,
      /sunglasses/i,
      /socks?/i,
      /hydration\s+pack/i,
      /vest/i,
      /jacket/i,
      /shorts?/i,
      /tights?/i,
      /massage\s+gun/i,
      /treadmill/i,
      /backpack/i,
      /belt/i,
      /armband/i,
      /hat/i,
      /cap/i,
      /gloves?/i,
      /bra/i
    ];

    // If title matches non-shoe pattern, skip this article
    if (nonShoePatterns.some(pattern => pattern.test(cleanTitle))) {
      return {
        scenario: 'irrelevant',
        confidence: 0.0
      };
    }

    // Expanded sneaker brands with common variations
    const brands = [
      'Nike', 'Adidas', 'Brooks', 'Asics', 'ASICS', 'New Balance', 'Hoka', 'HOKA',
      'Saucony', 'Mizuno', 'Puma', 'PUMA', 'Under Armour', 'Salomon', 'Merrell',
      'Altra', 'Topo Athletic', 'On', 'On Running', 'Allbirds', 'Vans', 'Converse',
      'Reebok', 'La Sportiva', 'Inov8', 'Inov-8', 'Arc\'teryx', 'The North Face',
      'Decathlon', 'Kailas', 'Scott', 'Craft', 'Tracksmith', 'Lululemon'
    ];

    // Check if this is a general/comparison article (no specific brand focus)
    const generalPatterns = [
      /best\s+running\s+shoes/i,
      /top\s+\d+\s+shoes/i,
      /running\s+shoes\s+for/i,
      /shoes?\s+comparison/i,
      /\d+\s+best\s+shoes/i,
      /beginner.+shoes/i,
      /shoes.+guide/i
    ];

    const isGeneral = generalPatterns.some(pattern => pattern.test(cleanTitle));

    // Look for brand in title - use word boundary matching for short brands
    const foundBrand = brands.find(brand => {
      const lowerBrand = brand.toLowerCase();
      const lowerTitle = cleanTitle.toLowerCase();

      // For very short brands (2 chars or less), require word boundaries
      if (brand.length <= 2) {
        const wordBoundaryPattern = new RegExp(`\\b${lowerBrand}\\b`, 'i');
        return wordBoundaryPattern.test(lowerTitle);
      }

      // For longer brands, simple includes is fine
      return lowerTitle.includes(lowerBrand);
    });

    if (!foundBrand) {
      return {
        scenario: isGeneral ? 'general' : 'general',
        confidence: isGeneral ? 0.8 : 0.3
      };
    }

    // If general pattern + brand mentioned, it's brand-focused
    if (isGeneral) {
      return {
        scenario: 'brand-only',
        brand: foundBrand,
        confidence: 0.8
      };
    }

    // Extract potential model after brand
    const brandIndex = cleanTitle.toLowerCase().indexOf(foundBrand.toLowerCase());
    const afterBrand = cleanTitle.slice(brandIndex + foundBrand.length).trim();

    // Enhanced model pattern matching
    const modelMatch = afterBrand.match(/^[\s\-:]*([\w\s\d\-+\.\/]+?)(?:\s*(?:review|test|vs|comparison|guide|running|shoe|trainer|multi\s+tester|performance)|$)/i);

    if (modelMatch && modelMatch[1]) {
      const model = modelMatch[1].trim();

      // Filter out common non-model words
      const excludeWords = /^(running|shoes?|trainer|sneaker|collection|range|line|series)$/i;
      if (excludeWords.test(model)) {
        return {
          scenario: 'brand-only',
          brand: foundBrand,
          confidence: 0.7
        };
      }

      // Higher confidence scoring
      const hasNumbers = /\d/.test(model);
      const hasSpecificWords = /\b(max|pro|elite|ultra|speed|ghost|gel|air|boost|wave|glycerin|pegasus|cumulus|nimbus)\b/i.test(model);
      const hasVersionNumber = /\b(v\d+|\d+\.\d+|\s+\d{1,2}(\s|$))/i.test(model);

      let confidence = 0.5;
      if (hasVersionNumber) confidence = 0.95;
      else if (hasNumbers) confidence = 0.85;
      else if (hasSpecificWords) confidence = 0.75;

      return {
        scenario: 'specific',
        brand: foundBrand,
        model: model,
        confidence
      };
    }

    // Has brand but no clear model - check if it's a brand collection article
    const brandCollectionPattern = /best|top|collection|range|shoes/i;
    if (brandCollectionPattern.test(afterBrand)) {
      return {
        scenario: 'brand-only',
        brand: foundBrand,
        confidence: 0.8
      };
    }

    return {
      scenario: 'brand-only',
      brand: foundBrand,
      confidence: 0.6
    };
  }

  private async extractSneakers(
    content: string,
    title: string,
    titleAnalysis: TitleAnalysis,
    date?: string,
    source?: string
  ): Promise<SneakerData[]> {

    // Skip irrelevant articles (headphones, watches, etc.)
    if (titleAnalysis.scenario === 'irrelevant') {
      console.log(`⏭️  SKIPPED: Non-shoe article detected in title: "${title}"`);
      return [];
    }

    if (!this.isSneakerContent(content + " " + title)) {
      return [];
    }

    const prompt = this.buildExtractionPrompt(content, title, titleAnalysis);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: this.getSystemPrompt(titleAnalysis) },
          { role: "user", content: prompt }
        ],
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      const extracted = this.normalizeSneakers(result.sneakers || [], date, source);

      // Apply post-extraction relevance filtering
      return this.filterRelevantSneakers(extracted, titleAnalysis, title, content);
    } catch (error) {
      console.error("Failed to extract sneakers:", error);
      return [];
    }
  }

  private filterRelevantSneakers(
    sneakers: SneakerData[],
    titleAnalysis: TitleAnalysis,
    title: string,
    content: string
  ): SneakerData[] {
    return sneakers.filter(sneaker => {
      return this.isRelevantSneaker(sneaker, titleAnalysis, title, content);
    });
  }

  private isRelevantSneaker(
    sneaker: SneakerData,
    titleAnalysis: TitleAnalysis,
    title: string,
    content: string
  ): boolean {
    const lowerTitle = title.toLowerCase();
    const sneakerBrand = sneaker.brand.toLowerCase();
    const sneakerModel = sneaker.model.toLowerCase();

    // STRICT FILTERING: Scenario A - Specific model mentioned in title
    if (titleAnalysis.scenario === 'specific' && titleAnalysis.brand && titleAnalysis.model) {
      const expectedBrand = titleAnalysis.brand.toLowerCase();

      // MUST exactly match the expected brand - NO exceptions
      if (sneakerBrand !== expectedBrand) {
        console.log(`🚫 FILTERED OUT: ${sneaker.brand} ${sneaker.model} - expected brand: ${titleAnalysis.brand}, got: ${sneaker.brand}`);
        return false;
      }

      return true; // Only exact brand match allowed
    }

    // STRICT FILTERING: Scenario C - Brand-only focus
    if (titleAnalysis.scenario === 'brand-only' && titleAnalysis.brand) {
      const expectedBrand = titleAnalysis.brand.toLowerCase();

      if (sneakerBrand !== expectedBrand) {
        console.log(`🚫 FILTERED OUT: ${sneaker.brand} ${sneaker.model} - expected brand: ${titleAnalysis.brand}, got: ${sneaker.brand}`);
        return false;
      }

      return true;
    }

    // STRICT FILTERING: Scenario B - General article
    if (titleAnalysis.scenario === 'general') {
      // For general articles, be EXTREMELY strict - they should NOT extract models unless explicitly focused

      // 1. Brand must be explicitly mentioned in title to be considered relevant
      const brandInTitle = lowerTitle.includes(sneakerBrand);

      if (!brandInTitle) {
        // For general articles, if brand is NOT in title, filter it out completely
        // This prevents extraction from comparison lists and casual mentions
        console.log(`🚫 FILTERED OUT: ${sneaker.brand} ${sneaker.model} - brand not in title of general article`);
        return false;
      }

      // 2. Even if brand is in title, model must be substantially discussed
      if (!this.isModelSubstantiallyDiscussed(sneaker.model, content)) {
        console.log(`🚫 FILTERED OUT: ${sneaker.brand} ${sneaker.model} - not substantially discussed in general article`);
        return false;
      }

      return true;
    }

    // Default: allow (shouldn't reach here)
    return true;
  }

  private countBrandMentions(brand: string, content: string): number {
    const lowerContent = content.toLowerCase();
    const lowerBrand = brand.toLowerCase();
    const matches = lowerContent.match(new RegExp(lowerBrand, 'g'));
    return matches ? matches.length : 0;
  }

  private isModelSubstantiallyDiscussed(model: string, content: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerModel = model.toLowerCase();

    // Split model into words
    const modelWords = lowerModel.split(/\s+/).filter(word => word.length > 2);

    if (modelWords.length === 0) return false;

    // Count how many model words appear in content
    let totalMentions = 0;
    for (const word of modelWords) {
      const matches = lowerContent.match(new RegExp(word, 'g'));
      if (matches) totalMentions += matches.length;
    }

    // Model must be mentioned at least 2 times to be considered "substantially discussed"
    return totalMentions >= 2;
  }

  private isModelMentioned(model: string, content: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerModel = model.toLowerCase();

    // Split model into key words and check if most are present
    const modelWords = lowerModel.split(/\s+/).filter(word =>
      word.length > 2 && !/^(the|and|or|in|on|at|for|with)$/.test(word)
    );

    if (modelWords.length === 0) return false;

    const foundWords = modelWords.filter(word => lowerContent.includes(word));
    const matchRatio = foundWords.length / modelWords.length;

    // Require at least 70% of model words to be found
    return matchRatio >= 0.7;
  }

  private isSneakerContent(text: string): boolean {
    const lower = text.toLowerCase();

    const sneakerWords = [
      "shoe", "shoes", "sneaker", "sneakers", "runner", "runners",
      "running shoe", "footwear", "kicks"
    ];

    const contextWords = [
      "review", "test", "comparison", "guide", "best", "top", "rated",
      "comfortable", "cushioning", "support", "trail", "road", "marathon",
      "jogging", "training", "athletic", "sports"
    ];

    const hasSneakerWords = sneakerWords.some(word => lower.includes(word));
    const hasContext = contextWords.some(word => lower.includes(word));

    return hasSneakerWords && hasContext;
  }

  private getSystemPrompt(titleAnalysis: TitleAnalysis): string {
    let specificInstructions = "";
    let filteringRules = "";

    if (titleAnalysis.scenario === 'specific') {
      specificInstructions = `
CRITICAL FOCUS: The title mentions "${titleAnalysis.brand} ${titleAnalysis.model}".
Extract specifications ONLY for this exact model. IGNORE all other shoe mentions.`;

      filteringRules = `
STRICT FILTERING RULES:
- Extract ONLY "${titleAnalysis.brand} ${titleAnalysis.model}"
- IGNORE any other brands/models mentioned (they are comparison noise)
- If this specific model is not described with characteristics, return empty array`;
    } else if (titleAnalysis.scenario === 'brand-only') {
      specificInstructions = `
BRAND FOCUS: The title focuses on "${titleAnalysis.brand}" brand.
Extract specifications ONLY for ${titleAnalysis.brand} models found in the content.`;

      filteringRules = `
BRAND FILTERING RULES:
- Extract ONLY ${titleAnalysis.brand} models
- IGNORE all other brands mentioned (they are comparison noise)
- Only include models with detailed specifications`;
    } else {
      specificInstructions = `
GENERAL ARTICLE: Extract all running shoe models that have detailed specifications.`;

      filteringRules = `
GENERAL FILTERING RULES:
- Extract models that have substantial characteristic data
- IGNORE brief mentions without specifications
- Focus on models that are actually reviewed/tested`;
    }

    return `Extract running shoe specifications from articles. ${specificInstructions}

${filteringRules}

MANDATORY REQUIREMENT:
- At least ONE of (heel OR drop) MUST be present with exact mm measurement
- If neither heel nor drop is stated, DO NOT extract this model at all

VALIDATION REQUIREMENTS - Only include if EXPLICITLY stated:
- heel/forefoot: Must have exact mm measurements
- drop: Must be stated in mm or calculable from heel/forefoot
- weight: Must have exact grams/ounces measurements
- price: Must have exact price with currency symbol
- waterproof: Only if Gore-Tex, "waterproof", "water-resistant" mentioned
- cushioning: Only if described as firm/stiff, balanced/moderate, or max/plush
- width: Only if narrow, standard/regular, or wide explicitly mentioned
- breathability: Only if air flow/breathability is explicitly described
- plate: Only if carbon fiber/plate explicitly mentioned

CRITICAL: Do NOT extract models that are only briefly mentioned without Stack specifications (heel/drop).

Return only valid JSON in this format:
{
  "sneakers": [
    {
      "brand": "string",
      "model": "string (full complete name)",
      "use": "daily trainer" | "tempo" | "race" | "trail" | null,
      "surface": "road" | "trail" | null,
      "heel": number | null,
      "forefoot": number | null,
      "drop": number | null,
      "weight": number | null,
      "price": number | null,
      "plate": boolean | null,
      "waterproof": boolean | null,
      "cushioning": "firm" | "balanced" | "max" | null,
      "width": "narrow" | "standard" | "wide" | null,
      "breathability": "low" | "medium" | "high" | null
    }
  ]
}

CRITICAL RULES:
- Heights in mm, weight in grams, price in USD
- Convert: 1 oz = 28.35g
- Price range: 40-500 USD, otherwise null
- Use null for ANY uncertain/unstated values
- Skip entries without both brand AND model
- Model names must be complete (e.g., "Evo SL" not "Evo")`;
  }

  private buildExtractionPrompt(content: string, title: string, titleAnalysis: TitleAnalysis): string {
    let instruction = "";

    if (titleAnalysis.scenario === 'specific') {
      instruction = `Focus on extracting specifications for: ${titleAnalysis.brand} ${titleAnalysis.model}`;
    } else if (titleAnalysis.scenario === 'brand-only') {
      instruction = `Focus on extracting ${titleAnalysis.brand} models with their specifications`;
    } else {
      instruction = `Extract all running shoe models with their specifications`;
    }

    return `Title: ${title}

${instruction}

Content: ${content}`;
  }

  private normalizeSneakers(sneakers: any[], date?: string, source?: string): SneakerData[] {
    return sneakers
      .filter((s: any) => this.isValidExtraction(s))
      .map((s: any) => ({
        brand: this.normalizeBrand(s.brand),
        model: this.normalizeModel(s.model),
        use: this.normalizeUse(s.use),
        surface: this.normalizeSurface(s.surface),
        heel: this.normalizeHeight(s.heel),
        forefoot: this.normalizeHeight(s.forefoot),
        drop: this.normalizeDrop(s.drop, s.heel, s.forefoot),
        weight: this.normalizeWeight(s.weight),
        price: this.normalizePrice(s.price),
        plate: this.normalizePlate(s.plate),
        waterproof: this.normalizeWaterproof(s.waterproof),
        cushioning: this.normalizeCushioning(s.cushioning),
        width: this.normalizeWidth(s.width),
        breathability: this.normalizeBreathability(s.breathability),
        date: date,
        source: source,
      }))
      .filter(s => this.isCompleteRecord(s));
  }

  private isValidExtraction(s: any): boolean {
    // Must have brand and model
    if (!s.brand || !s.model) return false;

    const brand = String(s.brand).trim();
    const model = String(s.model).trim();

    // Brand must be valid
    if (brand.length < 2 || brand.length > 30) return false;

    // Model must be valid
    if (model.length < 2 || model.length > 50) return false;

    // Skip obviously invalid models
    const invalidModels = /^(shoe|shoes|sneaker|trainer|running|review|test|performance|comparison)$/i;
    if (invalidModels.test(model)) return false;

    return true;
  }

  private isCompleteRecord(s: SneakerData): boolean {
    // Must have brand and model
    if (!s.brand || !s.model) return false;

    // MANDATORY: Must have at least one Stack value (heel OR drop)
    // This prevents extraction of irrelevant mentions without technical specs
    const hasStackData = !!(s.heel || s.drop);
    if (!hasStackData) {
      console.log(`🚫 FILTERED OUT: ${s.brand} ${s.model} - missing required Stack data (heel or drop)`);
      return false;
    }

    // MANDATORY: Must have Use OR Surface to confirm it's actually a running shoe
    // This prevents extraction of non-shoe items (headphones, watches, etc.)
    const hasRunningContext = !!(s.use || s.surface);
    if (!hasRunningContext) {
      console.log(`🚫 FILTERED OUT: ${s.brand} ${s.model} - missing Use or Surface (likely not a shoe)`);
      return false;
    }

    // Must have at least one meaningful characteristic
    const hasCharacteristics = !!(s.heel || s.forefoot || s.drop || s.weight || s.price ||
                                  s.use || s.surface || s.plate !== undefined ||
                                  s.waterproof !== undefined || s.cushioning ||
                                  s.width || s.breathability);

    return hasCharacteristics;
  }

  private normalizeBrand(brand: any): string {
    if (!brand) return "";

    const cleaned = String(brand).trim();

    // Common brand corrections
    const brandMap: Record<string, string> = {
      'ASICS': 'Asics',
      'HOKA': 'Hoka',
      'PUMA': 'Puma',
      'On Running': 'On',
      'THE NORTH FACE': 'The North Face',
      'NIKE': 'Nike',
      'ADIDAS': 'Adidas'
    };

    return brandMap[cleaned] || cleaned;
  }

  private normalizeModel(model: any): string {
    if (!model) return "";

    let cleaned = String(model).trim();

    // Remove common suffixes that shouldn't be part of model name
    cleaned = cleaned.replace(/\s+(review|test|performance|running|shoe|trainer)$/i, '');

    // Remove duplicate brand prefix (e.g., "On CloudUltra" when brand is already "On")
    // This happens when GPT extracts "brand: On, model: On CloudUltra"
    const knownBrands = ['Nike', 'Adidas', 'Hoka', 'Brooks', 'Asics', 'New Balance', 'Saucony', 'On', 'Salomon', 'Altra', 'Inov8', 'Mizuno', 'Puma', 'Under Armour'];
    for (const brand of knownBrands) {
      const brandPrefix = new RegExp(`^${brand}\\s+`, 'i');
      if (brandPrefix.test(cleaned)) {
        cleaned = cleaned.replace(brandPrefix, '');
        break;
      }
    }

    return cleaned;
  }

  private normalizePlate(plate: any): boolean | undefined {
    if (typeof plate === "boolean") return plate;
    if (typeof plate === "string") {
      const s = plate.toLowerCase();
      if (s.includes("carbon") || s.includes("plate")) return true;
      if (s.includes("no") || s.includes("none")) return false;
    }
    return undefined;
  }

  private normalizeWaterproof(waterproof: any): boolean | undefined {
    if (typeof waterproof === "boolean") return waterproof;
    if (typeof waterproof === "string") {
      const s = waterproof.toLowerCase();
      if (s.includes("gore-tex") || s.includes("waterproof") || s.includes("water-resistant")) return true;
      if (s.includes("not") || s.includes("no")) return false;
    }
    return undefined;
  }

  private normalizePrice(price: any): number | undefined {
    const p = Number(price);
    return (p >= 40 && p <= 500) ? Math.round(p) : undefined;
  }

  private normalizeWeight(weight: any): number | undefined {
    const w = Number(weight);
    return (w >= 100 && w <= 600) ? Math.round(w) : undefined;
  }

  private normalizeHeight(height: any): number | undefined {
    const h = Number(height);
    return (h >= 10 && h <= 60) ? Math.round(h) : undefined;
  }

  private normalizeDrop(drop: any, heel: any, forefoot: any): number | undefined {
    let d = Number(drop);

    // Calculate drop if not provided but heel and forefoot are available
    if ((!d || isNaN(d)) && heel && forefoot) {
      d = Number(heel) - Number(forefoot);
    }

    return (d >= 0 && d <= 20) ? Math.round(d) : undefined;
  }

  private normalizeUse(use: any): string | undefined {
    if (!use) return undefined;

    const s = String(use).toLowerCase();
    if (s.includes("daily") || s.includes("trainer")) return "daily trainer";
    if (s.includes("tempo")) return "tempo";
    if (s.includes("race")) return "race";
    if (s.includes("trail")) return "trail";

    return undefined;
  }

  private normalizeSurface(surface: any): "road" | "trail" | undefined {
    if (!surface) return undefined;

    const s = String(surface).toLowerCase();
    if (s.includes("trail")) return "trail";
    if (s.includes("road")) return "road";

    return undefined;
  }

  private normalizeCushioning(cushioning: any): "firm" | "balanced" | "max" | undefined {
    if (!cushioning) return undefined;

    const s = String(cushioning).toLowerCase();
    if (s.includes("firm") || s.includes("stiff")) return "firm";
    if (s.includes("max") || s.includes("plush") || s.includes("high")) return "max";
    if (s.includes("balanced") || s.includes("moderate") || s.includes("medium")) return "balanced";

    return undefined;
  }

  private normalizeWidth(width: any): "narrow" | "standard" | "wide" | undefined {
    if (!width) return undefined;

    const s = String(width).toLowerCase();
    if (s.includes("narrow") || s.includes("slim")) return "narrow";
    if (s.includes("wide") || s.includes("2e") || s.includes("4e")) return "wide";
    if (s.includes("standard") || s.includes("regular") || s.includes("medium")) return "standard";

    return undefined;
  }

  private normalizeBreathability(breathability: any): "low" | "medium" | "high" | undefined {
    if (!breathability) return undefined;

    const s = String(breathability).toLowerCase();
    if (s.includes("high") || s.includes("excellent") || s.includes("great")) return "high";
    if (s.includes("low") || s.includes("poor")) return "low";
    if (s.includes("medium") || s.includes("moderate") || s.includes("average")) return "medium";

    return undefined;
  }
}