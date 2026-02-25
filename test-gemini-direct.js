// اختبار مباشر لـ Gemini API باستخدام SDK الرسمي
import { readFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const envContent = readFileSync('.env', 'utf-8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
const GEMINI_API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

console.log('✅ API Key loaded:', GEMINI_API_KEY.substring(0, 10) + '...');
console.log('🔄 Initializing Google Generative AI SDK...');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const models = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
];

async function test() {
  for (const modelName of models) {
    console.log(`\n🧪 Testing model: ${modelName}`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Reply with "Success"');
      const response = await result.response;
      const text = response.text();

      console.log(`✅ SUCCESS! Reply: ${text}`);
      console.log(`🎉 الموديل العامل: ${modelName}`);
      process.exit(0);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  console.error('\n❌ جميع النماذج فشلت. تأكد من تفعيل API في Google Cloud Console.');
  process.exit(1);
}

test();
