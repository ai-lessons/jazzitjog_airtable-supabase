import 'dotenv/config';

function decodeJwt(token: string) {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);
console.log('KEY prefix:', key?.slice(0, 12)); // только первые символы, без секьюрных утечек

if (!key) {
  console.error('❌ Нет SUPABASE_SERVICE_ROLE_KEY в .env');
  process.exit(1);
}

try {
  const payload = decodeJwt(key);
  console.log('JWT role:', payload.role);
  console.log('iss:', payload.iss); // должен указывать на ваш проект
} catch (e) {
  console.error('❌ Ключ не похож на валидный JWT. Проверьте, что это именно service_role.');
}
