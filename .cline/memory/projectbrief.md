# Project Brief: Sneaker Pipeline

## Project Name
Sneaker Pipeline

## Version
1.0.0

## Core Mission
AI-powered extraction and normalization of sneaker data from Airtable articles, with automated ETL pipeline to Supabase (PostgreSQL), and a protected web UI for staging, approval, search, filter, and export.

## Primary Goals
1. **Automated Data Extraction**: Extract structured sneaker specifications from unstructured Airtable articles using hybrid regex + LLM approach
2. **Data Normalization**: Convert extracted data to canonical units and categorical values
3. **Quality Control**: Implement duplicate prevention, validation, and QC checks
4. **User Interface**: Provide staging, approval, search, and export capabilities through Next.js web app
5. **Data Integrity**: Maintain data quality through migrations, RLS policies, and proper error handling

## Key Requirements
- Extract sneaker specifications (brand, model, drop, heights, weight, price, features) from articles
- Normalize data to canonical units (mm for heights/drop, g for weight, USD for price)
- Prevent duplicates using `model_key` and composite unique constraints
- Support staging workflow for data approval before production
- Provide search/filter capabilities by brand, model, features
- Maintain authentication and authorization through Supabase Auth

## Success Metrics
- Successful extraction rate from Airtable articles
- Data quality (normalized values, no duplicates)
- Pipeline reliability (error handling, logging, metrics)
- User satisfaction with web interface

## Out of Scope
- Direct modification of Airtable data
- Real-time sync (batch processing only)
- Multi-language support
- Mobile app interface

## Project Context
This is an active production system that processes sneaker articles from Airtable, extracts specifications using AI/regex, normalizes the data, and stores it in Supabase for access via web interface. The web-app was recently converted from a submodule to a regular directory in the main repository.
