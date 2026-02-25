import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logError } from '../../utils/errorLogger';
import { authenticateUser } from '../../utils/authUtils';

const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
const ALLOWED_ORIGIN = process.env.APP_ORIGIN || process.env.VITE_APP_ORIGIN || 'http://localhost:5173';

// verifyFirebaseToken removed, imported from authUtils instead

/**
 * Prompt Template for Biography Generation
 */
function getBiographyPrompt(data: any): string {
    const { fullName, gender, birthDate, birthPlace, deathDate, deathPlace, parentsCount, spousesCount, childrenCount, relatives, toneInstruction, preferredLanguage } = data;

    return `أنت مؤرخ وأنساب محترف ومتخصص في كتابة السِيَر العائلية.

اكتب سيرة رسمية وقصيرة عن الشخص التالي باستخدام فقرات HTML من نوع <p>...</p> فقط.
اجعل السيرة لا تتجاوز 2 إلى 3 فقرات، وكل فقرة من 2 إلى 3 جمل قصيرة قدر الإمكان.
ابدأ السيرة بذكر اسم الشخص الحقيقي كما هو مذكور في البيانات (مثلاً: "وُلِدَ السيد ${fullName}" إن كان الاسم متوفرًا)، ثم مكان الميلاد وسنته، ثم عدد الزوجات/الأزواج وعدد الأبناء إن توفرت هذه المعلومات، ثم مهنته إن وُجدت، ثم مكان الوفاة وسنتها إن توفرت.
مهم: لا تستخدم أي أقواس مربعة أو نصوص شكلية مثل [الاسم الكامل] أو [سنة الميلاد] في النص النهائي، واستخدم بدلاً منها القيم الحقيقية من البيانات فقط.
هام: لا تضع السيرة داخل أي code block أو علامات \`\`\` أو \`\`\`html، أعد فقط فقرات <p>.
لغة الإخراج: ${preferredLanguage === 'ar' ? 'العربية الفصحى الحديثة' : 'الإنجليزية'}.
${toneInstruction}

قواعد مهمة:
- لا تخترع تواريخ أو أماكن أو أسماء أو أرقام غير موجودة في البيانات.
- إذا نقصت المعلومات، صرّح بذلك بشكل صريح وباختصار (مثلاً: لا تتوفر معلومات كافية عن مرحلة الطفولة أو عن عدد الأبناء).
- ركّز على أهم المعلومات المتاحة فقط، دون حشو أو تكرار.
- ركّز بشكل خاص على صلاته العائلية (عدد الأبناء، عدد الزوجات/الأزواج، والوالدين) متى توفرت البيانات.
- اجعل الأسلوب رسميًا ولغة النص واضحة ومباشرة ومناسبة لتطبيق شجرة عائلة.

بيانات الشخص:
- الاسم الكامل: ${fullName || 'غير معروف'}
- الجنس: ${gender ?? ''}
- تاريخ الميلاد: ${birthDate ?? ''}
- مكان الميلاد: ${birthPlace ?? ''}
- تاريخ الوفاة: ${deathDate ?? ''}
- مكان الوفاة: ${deathPlace ?? ''}

العلاقات العائلية (من البيانات المتاحة):
- عدد الوالدين المسجلين: ${parentsCount}
- عدد الزوجات/الأزواج المسجلين: ${spousesCount}
- عدد الأبناء المسجلين: ${childrenCount}

الأقارب الإضافيون (قد تكون القائمة ناقصة أو غير دقيقة):
${relatives}

إذا كانت المعلومات المتاحة قليلة جدًا، اكتب سيرة قصيرة جدًا توضّح أن المعلومات المتوفرة محدودة.`;
}

/**
 * Prompt Template for Ancestor Chat
 */
function getAncestorChatPrompt(data: any): string {
    const { fullName, birthPlace, birthDate, deathPlace, deathDate, preferredLanguage, historyText, newMessage } = data;

    return `أنت تتحدث بصوت أحد أسلاف هذه العائلة (مثل جد أو جدة حكيمة)، وتجيب عن أسئلة حفيد/حفيدة حول حياة هذا الشخص وعائلته.

اسم الشخص الذي تمثل دوره: ${fullName || 'غير معروف'}
مكان الميلاد: ${birthPlace || 'غير معروف'}
تاريخ الميلاد: ${birthDate || 'غير معروف'}
مكان الوفاة: ${deathPlace || 'غير معروف'}
تاريخ الوفاة: ${deathDate || 'غير معروف'}

لغة الحوار: ${preferredLanguage === 'ar' ? 'العربية الفصحى البسيطة' : 'الإنجليزية البسيطة'}.

قواعد المحادثة:
- أجب بجمل قصيرة وواضحة ومباشرة، كأنك تتحدث مع حفيدك.
- لا تخترع تواريخ أو أماكن أو أسماء غير موجودة في البيانات إذا كان السؤال يتطلب دقة عالية.
- يمكنك التوسّع ببعض السياق العام عن الحياة في تلك الفترة والمكان، ولكن بدون اختراع حقائق دقيقة عن الشخص نفسه.
- إذا لم تكن هناك معلومات كافية عن شيء معيّن، قل ذلك بصدق (مثلاً: "لا أملك تفاصيل دقيقة عن هذا الجانب من حياتي").
- لا تذكر أنك نموذج ذكاء اصطناعي، بل تحدّث بصوت الجد/الجدة.

سجل المحادثة السابقة (إن وجد):
${historyText || 'لا يوجد سجل سابق، هذه بداية المحادثة.'}

الرسالة الجديدة من الحفيد/الحفيدة:
المستخدم: ${newMessage}

أجب بجواب واحد فقط يمثل رد الجد/الجدة على هذه الرسالة.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!GOOGLE_AI_KEY) {
        return res.status(500).json({ error: 'AI Key not configured' });
    }

    const user = await authenticateUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { type, data } = req.body as { type: string; data: any };
    let prompt = '';

    if (type === 'biography') {
        prompt = getBiographyPrompt(data);
    } else if (type === 'ancestor_chat') {
        prompt = getAncestorChatPrompt(data);
    } else {
        return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.status(200).json({ result: text });
    } catch (error: any) {
        logError('API_GENERATE_AI', error, { showToast: false });
        return res.status(500).json({ error: 'AI generation failed', details: error.message });
    }
}
