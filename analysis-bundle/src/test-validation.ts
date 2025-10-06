// src/test-validation.ts - Test sneaker validation
import { shouldIncludeInSneakerDB, isNonSneakerItem, isSneakerItem } from './utils/sneakerValidation';

function testValidation() {
  console.log('🧪 Тестируем валидацию кроссовок...\n');

  // Тест 1: Явно НЕ кроссовки (должны быть отклонены)
  const nonSneakers = [
    ['Ciele Athletics', 'FLRJacket-Elite'], // куртка из примера
    ['Nike', 'Dri-FIT Jacket'],
    ['Adidas', 'Running Cap'],
    ['Brooks', 'Compression Sleeve'],
    ['Asics', 'Wind Jacket'],
    ['Polar', 'Heart Rate Monitor'],
    ['Garmin', 'GPS Watch'],
    ['Nike', 'Running Shorts'],
    ['Adidas', 'Training Hoodie']
  ];

  console.log('📝 Тест 1: НЕ кроссовки (должны быть отклонены)');
  for (const [brand, model] of nonSneakers) {
    const result = shouldIncludeInSneakerDB(brand, model);
    const status = result ? '❌ ОШИБКА' : '✅ Правильно';
    console.log(`${status}: ${brand} ${model} → ${result ? 'включено' : 'отклонено'}`);
  }

  // Тест 2: Очевидно кроссовки (должны быть приняты)
  const sneakers = [
    ['Nike', 'Air Max 270'],
    ['Adidas', 'Ultraboost 22'],
    ['Brooks', 'Ghost 17'],
    ['Asics', 'Gel-Nimbus 25'],
    ['Hoka', 'Clifton 9'],
    ['New Balance', 'Fresh Foam X 1080v12'],
    ['Saucony', 'Kinvara 14'],
    ['On', 'Cloudstratus 3'],
    ['Mizuno', 'Wave Rider 26'],
    ['Altra', 'Torin 6']
  ];

  console.log('\n📝 Тест 2: Кроссовки (должны быть приняты)');
  for (const [brand, model] of sneakers) {
    const result = shouldIncludeInSneakerDB(brand, model);
    const status = result ? '✅ Правильно' : '❌ ОШИБКА';
    console.log(`${status}: ${brand} ${model} → ${result ? 'включено' : 'отклонено'}`);
  }

  // Тест 3: Пограничные случаи
  const borderline = [
    ['Nike', 'Running Shoes'], // должно быть принято
    ['Unknown Brand', 'Casual Sneakers'], // должно быть принято
    ['Nike', 'Water Bottle'], // должно быть отклонено
    ['Adidas', 'Performance Socks'], // должно быть отклонено
    ['Brooks', 'Trail Runner'], // должно быть принято
    ['Unknown', 'Athletic Footwear'] // должно быть принято
  ];

  console.log('\n📝 Тест 3: Пограничные случаи');
  for (const [brand, model] of borderline) {
    const result = shouldIncludeInSneakerDB(brand, model);
    console.log(`🔍 ${brand} ${model} → ${result ? 'включено' : 'отклонено'}`);
  }

  // Проверим конкретно проблемный случай из запроса
  console.log('\n📝 Специальный тест: проблемный случай');
  const problematic = shouldIncludeInSneakerDB('Ciele Athletics', 'FLRJacket-Elite');
  console.log(`🎯 Ciele Athletics FLRJacket-Elite → ${problematic ? '❌ ОШИБКА: включено' : '✅ Правильно: отклонено'}`);

  console.log('\n🎉 Тестирование валидации завершено!');
}

try {
  testValidation();
} catch (error) {
  console.error('❌ Тест провален:', error);
  process.exit(1);
}