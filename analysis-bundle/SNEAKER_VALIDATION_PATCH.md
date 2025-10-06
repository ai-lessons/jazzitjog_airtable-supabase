# Патч: Жесткая валидация только кроссовок

## Проблема
В таблицу `shoe_results` попадали нерелевантные записи, например: "Ciele Athletics FLRJacket-Elite" (куртка).

## Решение
Установлено **жесткое правило**: в таблицу попадают исключительно кроссовки/беговая обувь.

## Изменения

### 1. Новый модуль валидации: `src/utils/sneakerValidation.ts`

**Функции:**
- `isNonSneakerItem(modelName)` - проверяет, является ли товар НЕ кроссовками
- `isSneakerItem(modelName)` - проверяет, является ли товар кроссовками
- `shouldIncludeInSneakerDB(brand, model)` - итоговое решение о включении

**Ключевые слова для исключения:**
- Одежда: jacket, куртка, shirt, hoodie, pants, shorts, etc.
- Аксессуары: watch, belt, bag, socks, insoles, etc.
- Оборудование: treadmill, tracker, monitor, headphones, etc.

**Ключевые слова для включения:**
- Обувь: shoe, sneaker, runner, trainer, boot, sandal, etc.
- Технологии: air, gel, boost, zoom, react, dna, foam, etc.
- Категории: trail, road, racing, daily, etc.

### 2. Интеграция валидации во все этапы пайплайна

#### A. LLM обогащение (`src/llm/enrich.ts`)
```typescript
// Обновлен промпт для LLM
"Extract ONLY SNEAKERS/RUNNING SHOES - NO jackets, shirts, accessories..."

// Добавлена валидация после LLM обработки
if (!shouldIncludeInSneakerDB(cleanedItem.brand, cleanedItem.model)) {
  console.log(`❌ Отклонена: не кроссовки - ${cleanedItem.brand} ${cleanedItem.model}`);
  continue;
}
```

#### B. Маппинг из Airtable (`src/pipeline/mapFromAirtable.ts`)
```typescript
// Валидация базового маппинга из Airtable
if (!shouldIncludeInSneakerDB(row.brand_name, row.model)) {
  console.log(`❌ Отклонена запись из Airtable: не кроссовки - ${row.brand_name} ${row.model}`);
  return null;
}
```

#### C. Сохранение в базу (`src/pipeline/saveToSupabase.ts`)
```typescript
// Финальная валидация перед записью в БД
.filter(r => {
  if (!shouldIncludeInSneakerDB(r.brand_name, r.model)) {
    console.log(`❌ Отклонена при сохранении: не кроссовки - ${r.brand_name} ${r.model}`);
    return false;
  }
  return true;
});
```

### 3. Тестирование: `src/test-validation.ts`

**Проверенные случаи:**
- ✅ `Ciele Athletics FLRJacket-Elite` → **отклонено**
- ✅ `Nike Dri-FIT Jacket` → **отклонено**
- ✅ `Brooks Ghost 17` → **принято**
- ✅ `Nike Air Max 270` → **принято**

## Результат

### До изменений:
- Куртки, аксессуары, часы попадали в таблицу кроссовок

### После изменений:
- **Трехуровневая защита**: LLM промпт + валидация после LLM + валидация перед БД
- **Жесткое правило**: только кроссовки/беговая обувь
- **Логирование**: все отклонения фиксируются в логах
- **Обратная совместимость**: существующий алгоритм работы не изменен

## Точки внедрения валидации:

1. **Промпт LLM** - предотвращает извлечение не-обуви на уровне AI
2. **После LLM** - фильтрует то, что AI все же извлек
3. **Маппинг Airtable** - фильтрует базовые записи
4. **Перед сохранением** - финальная проверка

## Тестирование
```bash
cd analysis-bundle
npx tsx src/test-validation.ts  # Тест валидации
npm run build                  # Проверка билда
```

Проблемный случай `Ciele Athletics FLRJacket-Elite` теперь **гарантированно отклоняется** на всех уровнях пайплайна.