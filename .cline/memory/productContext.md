# Product Context: Sneaker Pipeline

## Why This Project Exists

### The Problem
Running shoe enthusiasts, retailers, and researchers need structured, comparable data about sneaker specifications, but this information exists only in unstructured article format in Airtable. Manual extraction is time-consuming, error-prone, and doesn't scale.

### The Solution
An automated pipeline that:
1. Extracts structured specifications from unstructured articles
2. Normalizes data to comparable units and categories
3. Validates and prevents duplicates
4. Provides a user-friendly interface for review and search

## How It Works

### Data Source
- **Input**: Airtable articles containing sneaker reviews/specifications
- **Fields**: Title, content (HTML/text), published date, source link
- **Volume**: Multiple articles, each potentially containing multiple shoe models

### Processing Pipeline
1. **Ingest**: Fetch articles from Airtable with flexible field mapping
2. **Extract**: 
   - Title analysis determines extraction scenario (specific model, brand-only, general)
   - Regex patterns extract structured data (deterministic-first approach)
   - LLM fallback fills gaps when regex insufficient
   - Hybrid merge enriches text fields from LLM while keeping numeric from regex
3. **Normalize**: Convert to canonical units and categories
4. **Validate**: QC checks, duplicate prevention via model_key
5. **Upsert**: Write to Supabase with conflict handling

### User Interface
- **Staging View**: Review extracted data before approval
- **Approval Flow**: Approve/reject items with date normalization
- **Search**: Filter by brand, model, features (waterproof, carbon plate, etc.)
- **Export**: Download filtered results
- **Authentication**: Supabase Auth with RLS policies

## User Experience Goals

### For Data Curators
- Quick review of extracted data in staging area
- Easy approval/rejection workflow
- Clear visibility into extraction quality
- Ability to handle date formats (YYYY-MM-DD or NULL)

### For End Users (Search)
- Fast, accurate search by brand/model
- Intuitive filtering by features (waterproof, carbon plate, breathability)
- Export capabilities for filtered results
- Case-insensitive brand filtering

### For Developers/Maintainers
- Clear pipeline metrics and logging
- Type-safe codebase with TypeScript
- Comprehensive test coverage
- Well-documented architecture and patterns

## Key Features

### Extraction Intelligence
- **Hybrid Approach**: Regex first (fast, deterministic), LLM fallback (coverage)
- **Smart Merging**: Keep numeric precision from regex, enrich descriptions from LLM
- **Title Analysis**: Determines extraction strategy based on article title

### Data Quality
- **Normalization**: All heights/drop in mm, weight in grams, price in USD
- **Categorization**: Breathability (low/medium/high), booleans (carbon_plate, waterproof)
- **Duplicate Prevention**: model_key + composite unique constraint (airtable_id, brand_name, model)
- **Validation**: Range checks, unit conversions, warning collection

### Developer Experience
- **Type Safety**: Full TypeScript with Zod validation
- **Logging**: Structured logging with pino
- **Metrics**: Pipeline execution metrics
- **Testing**: Vitest for unit and integration tests
- **CLI**: Flexible command-line interface with --limit, --dry-run, --upsert-concurrency options

## Current State
- Core ETL pipeline is functional and modular
- Web interface operational with auth, staging, approval, and search
- Recently converted web-app from submodule to regular directory
- Active development with focus on stability and refinement
