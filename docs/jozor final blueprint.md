# 🏗️ Jozor — The Final UI Blueprint
> وثيقة التنفيذ النهائية لإعادة هيكلة واجهة جذور
> الحالة: **معتمدة للتنفيذ**
> تاريخ الاعتماد: مارس 2026

---

## نظرة عامة على التغيير

| من (الحالي) | إلى (الجديد) |
|------------|-------------|
| 20+ Modal متفرق | 6 وحدات واضحة المسؤولية |
| إعدادات في 3 أماكن مختلفة | Appearance Lab واحد |
| Sidebar ضيق بـ 5 تبويبات | Smart Persona Drawer قابل للتوسع |
| لا توجد إجراءات سريعة | Context Menu بالزر الأيمن |
| Consistency Checker يدوي | Smart Checker آلي |
| مؤشر sync مخفي | Status Dot دائم في الهيدر |

---

## الوحدة 1 — The Vault 🛡️

**النمط:** Left Drawer (Side Panel)
**نقطة الدخول:** أيقونة درع في الهيدر مع Status Dot

### Status Dot — المؤشر الدائم

يظهر دائماً بجانب أيقونة The Vault في الهيدر.
لا يختفي أبداً. لا يتطلب فتح أي قائمة.

```
🟢 أخضر   → متزامن بالكامل مع Supabase + Drive
🟡 أصفر   → جاري الحفظ أو في الانتظار (pending changes)
🔴 أحمر   → خطأ في المزامنة — يحتاج تدخل
⚪ رمادي  → بدون اتصال (Offline)
```

**السلوك:**
- النقر على الـ Status Dot يفتح The Vault مباشرة على تبويب "السحابة"
- يُحدَّث لحظياً من `SyncStatus` في Zustand store
- يدعم Micro-animation عند الانتقال بين الحالات (لا flash مفاجئ)

---

### التبويب 1: إدارة السحابة ☁️

```
حالة المزامنة الحالية
  ├── Supabase: [متزامن / جاري / خطأ]
  ├── Google Drive: [متزامن / جاري / خطأ]
  ├── آخر مزامنة: [تاريخ + وقت]
  └── عدد التغييرات المعلقة: [عدد]

مدير ملفات Drive
  ├── قائمة الملفات (اسم + تاريخ)
  ├── تحميل ملف
  ├── حفظ كملف جديد
  ├── الكتابة فوق الملف الحالي
  └── حذف ملف

سجل النشاط
  └── آخر 50 عملية (من، ماذا، متى)
```

---

### التبويب 2: الأمان والاستعادة 🔒

```
النسخ الاحتياطية (Snapshots)
  ├── قائمة النسخ (تسمية + تاريخ + عدد الأشخاص)
  ├── [أخذ نسخة الآن] ← زر رئيسي
  ├── استعادة نسخة ← مع تأكيد إلزامي
  └── حذف نسخة قديمة

بروتوكول الاستعادة (يُطبَّق تلقائياً):
  1. التحقق من سلامة الملف
  2. تحديث Zustand أولاً
  3. مزامنة Supabase ثانياً
  4. إشعار نجاح/فشل
```

**قاعدة:** لا Base64 في أي Snapshot — صور كـ URL فقط.

---

### التبويب 3: تصدير البيانات 📦

*الهدف: نقل البيانات وتوافقها مع أنظمة أخرى*

```
├── GEDCOM (.ged)   ← معيار شجرة العائلة العالمي
├── JSON (.json)    ← بيانات خام
├── .jozor          ← تنسيق جذور الخاص
└── ICS (.ics)      ← تقويم (أعياد الميلاد والمناسبات)
```

---

### التبويب 4: التصدير البصري 🖼️

*الهدف: المشاركة والطباعة والتوثيق المرئي*

```
├── PDF             ← طباعة أو توثيق
├── PNG             ← صورة عالية الدقة
├── SVG             ← رسوم متجهية قابلة للتكبير
├── JPEG            ← مشاركة سريعة
└── طباعة مباشرة   ← Print Dialog
```

---

### التبويب 5: إدارة الشجرات 🌳

```
شجراتي
  ├── قائمة الشجرات المملوكة
  ├── الشجرة النشطة حالياً [مُميَّزة]
  ├── التبديل بين الشجرات
  └── [إنشاء شجرة جديدة]

الشجرات المشتركة معي
  ├── دعوات معلقة (قبول / رفض)
  └── شجرات أتعاون فيها (دوري: viewer / editor)

استيراد
  ├── استيراد ملف .jozor
  ├── استيراد JSON
  └── استيراد GEDCOM
```

---

## الوحدة 2 — Appearance Lab 🎨

**النمط:** Right Drawer
**نقطة الدخول:** أيقونة فرشاة في الهيدر

### الواجهة الافتراضية: Presets

ثلاثة قوالب جاهزة تحل محل 10 سلايدرات يدوية:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Classic   │  │   Compact   │  │   Artistic  │
│             │  │             │  │             │
│  هرمي واسع │  │  مضغوط سريع│  │  دائري أنيق│
│  للعائلات  │  │  للشجرات   │  │  للعرض     │
│  الكبيرة   │  │  الكبيرة   │  │  والطباعة  │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

### خيارات الرؤية (Visibility Toggles)

```
البيانات الشخصية
  ├── ◉ الصورة
  ├── ◉ الاسم الأوسط
  ├── ◉ الاسم قبل الزواج
  ├── ◉ اللقب
  ├── ◉ المهنة
  └── ◉ الجنس

التواريخ
  ├── ◉ تاريخ الميلاد
  ├── ◉ تاريخ الزواج
  └── ◉ تاريخ الوفاة

الأماكن
  ├── ◉ مكان الميلاد
  ├── ◉ مكان الزواج
  └── ◉ مكان الدفن

خاص
  ├── ◉ إظهار المتوفين
  ├── ◉ تمييز فرع
  └── ◉ خريطة مصغرة (Minimap)

الخصوصية
  └── ◉ وضع العرض العام (Privacy Mode)
         عند التفعيل: تُستبدل كل الصور بأيقونات رمزية
         السلوك: if (privacyMode) → showAgeGenderPlaceholder()
         الهدف: عرض الشجرة في أماكن عامة أو مع أطراف خارجية
         الأداء: المتصفح لا يُحمّل أي صورة من السحابة في هذا الوضع
```

---

### نوع المخطط

```
○ Focus Mode    ← الافتراضي
                   يدمج: Descendant + Pedigree + Hybrid
                   يعرض: الشخص المحدد + أجداده + أحفاده + أزواجه المباشرين
                   العمق: يتحكم فيه generationLimit من TreeSettings

○ Radial Mode   ← العرض الدائري الشامل
                   يدمج: Fan Chart
                   الهدف: العرض الجمالي والطباعة
```

> ⚠️ Force Layout محذوف نهائياً — انظر الملحق التقني في نهاية الوثيقة

---

### الثيم

```
○ Modern    ← الافتراضي
○ Vintage
○ Blueprint
○ Dark

● اللون الأساسي: [color picker]
```

---

### Advanced Mode (مخفي افتراضياً)

```
[🔧 تخصيص متقدم ▼]  ← زر toggle يكشف ما يلي:

التخطيط
  ├── تباعد أفقي ────────●──── [slider]
  ├── تباعد رأسي ──────●────── [slider]
  ├── عرض البطاقة ────●──────── [slider]
  └── حد الأجيال: [1..10]

الخطوط
  ├── نمط: منحنى / مستقيم / متدرج
  ├── سُمك ─────●──────────────── [slider]
  └── حجم النص ──────●────────── [slider]

التلوين
  └── تلوين البطاقات: جنس / سلالة / بدون

الأداء
  ├── ◉ وضع رسومات منخفضة
  └── ◉ فيزياء الحركة (Force Physics)
```

---

## الوحدة 3 — Smart Persona Drawer 👤

**النمط:** Expandable Bottom Sheet / Side Drawer
**نقطة الدخول:** النقر على أي Node في الشجرة
**الحالات:**
- **Collapsed** (افتراضي على موبايل): 30% من الشاشة — الاسم والصورة فقط
- **Expanded:** 70% من الشاشة — كل التبويبات
- **Full** (على Desktop): Drawer جانبي بعرض 420px

---

### التبويب 1: عن الشخص

*صفحة مستمرة قابلة للتمرير — بدون تبويبات فرعية*

```
── الهوية ──────────────────────────────
  صورة + الاسم الكامل + اللقب
  البادئة / اللاحقة / الجنس

── الحياة ───────────────────────────────
  تاريخ الميلاد + مكانه
  تاريخ الوفاة + مكانه + مكان الدفن
  مكان الإقامة
  ◉ متوفى

── العمل ────────────────────────────────
  المهنة + الشركة + الاهتمامات

── السيرة ───────────────────────────────
  نص حر (bio)

── التواصل ──────────────────────────────
  البريد + الموقع + المدونة + العنوان

── المصادر والأحداث ──────────────────────
  أحداث مخصصة (إضافة / تعديل / حذف)
  مصادر ومراجع (إضافة / تعديل / حذف)
```

---

### التبويب 2: الروابط

```
── الشركاء ──────────────────────────────
  قائمة الزيجات
    ├── نوع العلاقة: متزوج / مطلق / مخطوب / منفصل
    ├── تاريخ الزواج + مكانه
    └── تاريخ الانفصال + مكانه

── الأبناء ───────────────────────────────
  قائمة الأبناء مع صورة مصغرة
  النقر → تنقل للشخص في الشجرة

── الحسابات السياقية ─────────────────────
  الفارق العمري مع كل والد
  الفارق العمري مع كل ابن
  العمر عند زواجه الأول
  العمر عند إنجاب أول ابن
```

*لا توجد آلة حاسبة مستقلة — الحسابات تظهر سياقياً هنا تلقائياً.*

---

### التبويب 3: الوسائط

```
── الصورة الرئيسية ──────────────────────
  عرض + رفع + حذف

── معرض الصور ───────────────────────────
  Grid عرض الصور
  إضافة صور + حذف

── ملاحظات صوتية ────────────────────────
  تسجيل جديد + تشغيل + حذف
```

---

### أزرار الإجراءات (Footer ثابت)

```
[ + أب ]  [ + أم ]  [ + زوج ]  [ + ابن ]  [ ربط ]  [ 🗑️ ]
```

---

## الوحدة 4 — Context Menu ⚡

**النمط:** Floating Overlay
**الاستدعاء:**
- Desktop: Right-click على Node
- Mobile: Long-press (500ms) على Node

### القائمة

```
┌─────────────────────────┐
│  [اسم الشخص]            │
├─────────────────────────┤
│  + إضافة أب             │
│  + إضافة أم             │
│  + إضافة زوج / زوجة    │
│  + إضافة ابن / ابنة     │
├─────────────────────────┤
│  🔗 ربط بشخص موجود      │
│  ✏️  تعديل               │
│  🎯 تعيين كجذر للشجرة   │
├─────────────────────────┤
│  🗑️  حذف                 │
└─────────────────────────┘
```

**السلوك:**
- يُغلق عند النقر خارجه أو الضغط Escape
- "حذف" تفتح تأكيد قبل التنفيذ
- "تعديل" يفتح Smart Persona Drawer مباشرة
- غير متاح لـ viewer (يظهر للقراءة فقط)

---

## الوحدة 5 — Smart Checker 🔍

**النمط:** Toast / In-app Notification
**الاستدعاء:** تلقائي أثناء الإدخال أو الحفظ — لا يحتاج فتح يدوي

### أنواع التنبيهات

```
🔴 خطأ منطقي (يمنع الحفظ)
  "تاريخ الوفاة أقدم من تاريخ الميلاد"
  "الشخص مضاف كأب لنفسه"

🟡 تحذير (لا يمنع الحفظ)
  "عمر الأم عند الإنجاب: 11 سنة — هل هذا صحيح؟"
  "الفارق بين الزواج والإنجاب: 3 أشهر — تأكيد؟"
  "لا يوجد تاريخ ميلاد لهذا الشخص"

🔵 اقتراح (معلومة فقط)
  "هذا الشخص لديه 3 أبناء غير مرتبطين بأم"
```

**السلوك:**
- Toast خفيف في الزاوية — لا يقطع العمل
- قابل للإغلاق فوراً
- لا تراكم — أهم تنبيه فقط يظهر في كل وقت
- سجل كامل للتنبيهات السابقة في The Vault → تبويب السحابة

---

## الرحلة الجغرافية 🗺️

**النمط:** Full Modal (أداة مستقلة تُفتح من قائمة الأدوات)
**الوصف:** دمج خريطة المواقع + خريطة الهجرة في أداة واحدة

### وضعا العرض

```
○ مواقع الأحداث
  نقاط على الخريطة: ميلاد / زواج / وفاة / إقامة
  النقر على نقطة → بطاقة الشخص المرتبط

○ رحلة الهجرة
  خطوط تتبع حركة العائلة عبر الأجيال
  فلتر بالجيل أو بالسنة
```

---

## قائمة الأدوات المبقّاة (المبسّطة)

*تُفتح كلها من أيقونة أدوات واحدة في الهيدر*

```
├── 🤖 المساعد الذكي (AI Chat)
├── 📊 إحصاءات الشجرة
├── 📅 الجدول الزمني
└── 🗺️ الرحلة الجغرافية
```

*تم حذف: الآلة الحاسبة المستقلة، Consistency Checker اليدوي*

---

## المحذوفات النهائية 🗑️

```
❌ بيانات التشخيص (Last Hydration, Event Source, Telemetry)
   السبب: بيانات برمجية لا تهم المستخدم النهائي

❌ الآلة الحاسبة كأداة مستقلة
   البديل: حسابات سياقية تلقائية في تبويب الروابط

❌ Consistency Checker اليدوي
   البديل: Smart Checker آلي

❌ سلايدرات التنسيق من الواجهة الرئيسية
   البديل: Presets + Advanced Mode مخفي في Appearance Lab

❌ Modal مدير الشجرات المنفصل
   البديل: تبويب "إدارة الشجرات" داخل The Vault

❌ Modal سجل النسخ الاحتياطية المنفصل
   البديل: تبويب "الأمان والاستعادة" داخل The Vault
```

---

## ترتيب التنفيذ المقترح

> مبني على مبدأ: الأمن أولاً، ثم القيمة الفورية، ثم التوسع.
> انظر الملحق التقني "البنية التحتية الهجينة" في نهاية الوثيقة للتفاصيل الكاملة.

```
المرحلة 0 — التحصين الأمني (أسبوع) ← أولوية قصوى
  ├── نقل Gemini API إلى Vercel Edge Function (api/ai-proxy)
  ├── إخفاء GEMINI_API_KEY في Environment Variables
  └── لا ميزات جديدة قبل إتمام هذه المرحلة

المرحلة 1 — الأساس والبنية (أسبوعان)
  ├── Status Dot في الهيدر
  ├── The Vault كـ Left Drawer (التبويبات الخمسة)
  └── نقل المحتوى الموجود — لا منطق جديد

المرحلة 2 — محرك الشجرة (أسبوعان)
  ├── بناء calculateFocusLayout() و calculateRadialLayout()
  ├── حذف Force Layout من الكود
  └── تنفيذ Anchor Protocol + CSS Transitions

المرحلة 3 — الشخص (أسبوعان)
  ├── Smart Persona Drawer (Expandable)
  ├── دمج Info + Bio + Contact في صفحة مستمرة
  └── الحسابات السياقية في تبويب الروابط

المرحلة 4 — الأدوات (أسبوعان)
  ├── Context Menu (Right-click + Long-press)
  ├── Appearance Lab (Right Drawer + Presets + نمطا العرض)
  └── دمج الخرائط في "الرحلة الجغرافية"

المرحلة 5 — الإشعارات الداخلية (أسبوعان)
  ├── Notification Bell + Badge في الهيدر
  ├── Notification Center (Dropdown Panel)
  └── ربط InvitationTelemetry الموجود بالواجهة

المرحلة 6 — بنية Push الخارجية (أسبوعان)
  ├── Service Worker في /public (PWA)
  ├── جدول push_subscriptions في Supabase
  └── api/push-notifier كـ Vercel Edge Function

المرحلة 7 — الأتمتة الذكية (أسبوع)
  ├── Supabase Cron يفحص birthDate يومياً
  ├── استدعاء push-notifier عند المطابقة
  ├── Smart Checker (Toast System)
  └── احترام Notification Preferences لكل مستخدم
```

---

## ملاحظات التنفيذ لوكيل الذكاء الاصطناعي

```
1. كل وحدة = Feature منفصلة في FEATURE_MAP.md
2. لا تُنفَّذ وحدتان في نفس الـ PR
3. المحتوى يُنقل أولاً — ثم يُحذف المكان القديم بعد اختبار كامل
4. Smart Checker لا يمنع الحفظ إلا في حالة الأخطاء المنطقية فقط
5. Status Dot مصدره SyncStatus في useAuthStore — لا منطق جديد
6. Context Menu: viewer يرى القائمة بدون أزرار التعديل
7. The Vault تبويب 5 (إدارة الشجرات) يستبدل TreeManagerModal
8. Force Layout يُحذف في المرحلة 2 — لا يُبقى عليه كـ legacy
9. calculateFocusLayout و calculateRadialLayout يعيشان في src/engine/layout/treeLayout.ts
10. لا تُضاف مكتبات تحريك جديدة — D3 + CSS transitions حصراً
11. المرحلة 0 إلزامية قبل أي شيء — GEMINI_API_KEY لا يبقى في الـ client ولو يوماً واحداً
12. كل Edge Function تعيش في /api — لا منطق Gemini أو Push خارجها
13. push_subscriptions جدول Supabase — يُنشأ بـ migration لا بكود تطبيق
14. Service Worker يعيش في /public/sw.js — لا يُدمج مع Vite build
15. Supabase Cron يستدعي Edge Function — لا يكتب لـ Zustand مباشرة
16. Privacy Mode يُخزَّن في TreeSettings كـ privacyMode: boolean — لا state محلي
17. أيقونات Privacy Mode = SVG مدمجة من lucide-react — لا تحميل من مصادر خارجية
18. supabase.auth.onAuthStateChange() يُستدعى في App.tsx أو supabaseClient.ts عند التهيئة — لا في hooks فرعية
19. عند الـ refresh: استعادة الجلسة من Supabase قبل رسم أي component يحتاج auth
20. Status Dot يظهر ⚪ أثناء استعادة الجلسة ثم 🟢 عند النجاح — لا إعادة توجيه للـ login
```

---

*The Final Blueprint — Jozor UI Redesign*
*معتمد: مارس 2026 | الحالة: جاهز للتنفيذ*

---

## ملحق تقني — هندسة المخططات (Layout Engineering Spec v2)

> هذا الملحق يحكم كل قرار تقني متعلق بمحرك رسم الشجرة.
> يُقرأ قبل لمس أي ملف في `src/engine/` أو `treeLayout.worker.ts`.

---

### 1. حسم الأنماط النهائي

**من 4 خيارات متفرقة إلى نمطين وظيفيين:**

| النمط القديم | المصير | يندمج في |
|-------------|--------|----------|
| Descendant (هرمي) | ✅ مدموج | Focus Mode |
| Pedigree (أجداد) | ✅ مدموج | Focus Mode |
| Fan (دائري) | ✅ مدموج | Radial Mode |
| Force (فيزيائي) | ❌ محذوف نهائياً | — |

---

### 2. Focus Mode — التعريف الإجرائي الكامل

```
المدخل:
  selectedPersonId: string
  people: Record<string, Person>
  generationLimit: number   ← من TreeSettings الموجود

المخرج:
  TreeNode[]   ← العقد المرئية فقط

خوارزمية الاختيار:
  ✅ الشخص المحدد (نقطة المركز)
  ✅ أجداده الصاعدون حتى [generationLimit] جيل للأعلى
  ✅ أحفاده النازلون حتى [generationLimit] جيل للأسفل
  ✅ أزواجه المباشرون فقط (بدون عائلة الزوج)
  ❌ الإخوة والأعمام — لا يُعرضون في هذا النمط
  ❌ عائلة الزوج — لا يُعرضون في هذا النمط
```

**لماذا هذا الاختيار؟**
يُغطي 95% من حالات الاستخدام اليومي. المستخدم يريد رؤية "من أنا في سياق عائلتي المباشرة" — لا رسم الشجرة كاملة في كل مرة.

---

### 3. Radial Mode — التعريف الإجرائي

```
المدخل:
  rootPersonId: string        ← قد يختلف عن selectedPersonId
  people: Record<string, Person>
  generationLimit: number

المخرج:
  FanArc[]   ← قطاعات دائرية مرتبة

الخوارزمية:
  الشخص المحدد في المركز
  كل جيل يشكل دائرة خارجية أكبر
  القطاعات تتوسع تدريجياً كلما زاد عدد الأحفاد في الجيل
```

**الاستخدام المقصود:** العرض الجمالي، الطباعة، استكشاف الشجرة بصرياً.

---

### 4. حذف Force Layout — نهائي وغير قابل للتراجع

```typescript
// ❌ هذا الكود يُحذف بالكامل في المرحلة 2:
// - كل import لـ d3-force داخل treeLayout.worker.ts
// - دالة calculateForceLayout() بالكامل
// - enableForcePhysics من TreeSettings
// - enableTimeOffset من TreeSettings
// - timeScaleFactor من TreeSettings

// السبب التقني:
// D3 Force Simulation تعمل بـ requestAnimationFrame loop مستمر
// حتى عند السكون التام — هذا يستهلك CPU باستمرار
// ولا يتوقف إلا بـ simulation.stop() الصريح
```

**تحذير للمنفذ:** احذف أيضاً الـ types المرتبطة من `types.ts` — لا تتركها كـ legacy.

---

### 5. بروتوكول المركزية (Anchor Protocol)

**المشكلة:** عند التبديل بين Focus و Radial، الشجرة تقفز بصرياً وتفقد المستخدم موضعه.

**الحل:**

```typescript
// عند استدعاء أي دالة layout:
function applyLayout(
  layoutFn: LayoutFunction,
  activeNodeId: string,
  viewportCenter: { x: number; y: number }
): TreeNode[] {

  // 1. احسب الإحداثيات الجديدة لكل عقدة
  const nodes = layoutFn(activeNodeId);

  // 2. ابحث عن إحداثيات الـ Active Node في النتيجة
  const activeNode = nodes.find(n => n.id === activeNodeId);
  if (!activeNode) return nodes;

  // 3. احسب الإزاحة اللازمة لتثبيته في مركز الشاشة
  const offsetX = viewportCenter.x - activeNode.x;
  const offsetY = viewportCenter.y - activeNode.y;

  // 4. أضف الإزاحة لكل العقد
  return nodes.map(node => ({
    ...node,
    x: node.x + offsetX,
    y: node.y + offsetY,
  }));
}

// النتيجة: Active Node يبقى في نفس موضعه البصري
// بقية الشجرة تتحرك حوله — لا "قفزة" مرئية
```

---

### 6. الانتقالات (Zero-Dependency Transitions)

**القاعدة:** لا Framer Motion. لا مكتبات تحريك جديدة.
**الأدوات المتاحة:** D3 interpolation (موجودة) + CSS transitions (موجودة).

#### الآلية:

```typescript
// الخطوة 1: D3 يحسب الإحداثيات الانتقالية
import { interpolate } from 'd3-interpolate'; // موجودة في d3

const interpolator = interpolate(oldPositions, newPositions);

// الخطوة 2: CSS يتولى الحركة المرئية
// في global.css أو component CSS:
```

```css
.tree-node {
  transition: transform 300ms ease-in-out;
  /* 300ms = التوقيت المتفق عليه */
  /* ease-in-out = تباطؤ طبيعي في البداية والنهاية */
}

/* إيقاف الانتقال أثناء السحب أو الـ pan */
.tree-node.dragging {
  transition: none;
}

/* احترام إعدادات الأجهزة لتقليل الحركة */
@media (prefers-reduced-motion: reduce) {
  .tree-node {
    transition: none;
  }
}
```

```typescript
// الخطوة 3: تطبيق الإحداثيات عبر CSS transform
node.style.transform = `translate(${x}px, ${y}px)`;
// CSS يتولى الحركة من الموضع القديم إلى الجديد تلقائياً
// بمعدل 60fps بدون JavaScript loop
```

**لماذا هذا يعمل بـ 60fps؟**
`transform: translate()` يعمل على الـ GPU compositor thread مباشرة — لا يُشغّل الـ layout أو الـ paint في المتصفح.

---

### 7. مهام الـ Refactoring (التنفيذ الكامل)

#### الملف المستهدف الرئيسي
```
src/engine/layout/treeLayout.ts   ← ينشأ هنا (إذا لم يكن موجوداً)
treeLayout.worker.ts              ← يُنظَّف هنا
```

#### الدوال الجديدة

```typescript
// الدالة الأولى — Focus Mode
function calculateFocusLayout(
  rootNodeId: string,
  people: Record<string, Person>,
  limit: number = 3
): TreeNode[] {
  // 1. بناء subgraph: أجداد + أحفاد + أزواج مباشرون
  // 2. تطبيق hierarchical layout (D3 tree/hierarchy)
  // 3. إرجاع العقد بإحداثياتها
}

// الدالة الثانية — Radial Mode
function calculateRadialLayout(
  rootNodeId: string,
  people: Record<string, Person>,
  limit: number = 3
): FanArc[] {
  // 1. بناء subgraph: الأجداد والأحفاد
  // 2. تطبيق D3 partition أو custom radial algorithm
  // 3. إرجاع القطاعات الدائرية
}
```

#### الدوال المحذوفة

```typescript
// ❌ تُحذف كلها:
calculateDescendantLayout()   // → مدموجة في calculateFocusLayout
calculatePedigreeLayout()     // → مدموجة في calculateFocusLayout
calculateFanLayout()          // → مدموجة في calculateRadialLayout
calculateForceLayout()        // → محذوفة نهائياً بلا بديل
```

#### الـ Types المحذوفة من types.ts

```typescript
// ❌ تُحذف من TreeSettings:
enableForcePhysics?: boolean;
enableTimeOffset?: boolean;
timeScaleFactor?: number;

// ⚠️ تبقى (مُعاد توظيفها):
chartType: ChartType;
// تصبح: 'focus' | 'radial'
// بدلاً من: 'descendant' | 'fan' | 'pedigree' | 'force'
```

---

### 8. ترتيب تنفيذ المرحلة 2

```
الأسبوع الأول:
  1. كتابة calculateFocusLayout() مع اختبارات
  2. كتابة calculateRadialLayout() مع اختبارات
  3. التحقق: npm run test ← يجب أن يمر بالكامل

الأسبوع الثاني:
  4. حذف الدوال الأربع القديمة
  5. تحديث ChartType في types.ts
  6. حذف Force-related fields من TreeSettings
  7. تطبيق Anchor Protocol في applyLayout()
  8. إضافة CSS transitions لـ .tree-node
  9. التحقق النهائي: npm run typecheck + lint + test + e2e:smoke
```

**قاعدة الأسبوع الأول:** لا تحذف الدوال القديمة حتى تنجح الدوال الجديدة في كل الاختبارات.
**قاعدة الأسبوع الثاني:** لا تبدأ الحذف حتى تنتهي الكتابة والاختبار كاملاً.

---

*Layout Engineering Spec v2 — معتمد: مارس 2026*
*جزء من: Jozor Final UI Blueprint*

---

## ملحق تقني — نظام الإشعارات (Notification System Spec v1)

> هذا الملحق مبني على فحص مباشر للكود في المستودع.
> يُقرأ قبل لمس أي ملف متعلق بالإشعارات أو التعاون أو المناسبات.

---

### 1. الواقع الحالي — ما هو موجود وما هو غائب

#### موجود في الكود ✅

```typescript
// types.ts — هيكل البيانات موجود لكن غير مفعّل كاملاً

interface NotificationTelemetry {
  lastEventAt: Date | null;
  lastEventType: 'none' | 'birthday' | 'integrity';   // ← نوعان معرّفان
  lastEventSource: 'none' | 'heritage' | 'integrity';
  lastEventPersonId?: string;
  lastEventDedupKey?: string;   // ← منع التكرار موجود
  lastBirthdayName?: string;    // ← حقل أعياد الميلاد موجود
  lastSkippedAt: Date | null;
  lastSkippedReason?: string;
}

interface InvitationTelemetry {
  lastEventSource: 'none' | 'my-realtime' | 'owned-realtime' | 'activity-log';
  lastEventStatus?: string;     // ← تتبع حالة الدعوات
  lastOwnerEventEmail?: string; // ← بريد صاحب الدعوة
  lastOwnerEventRole?: string;  // ← الدور المُعطى
}

// Supabase Realtime مُستخدم فعلاً للتعاون
// treeInvitationService.ts موجود — يتعامل مع دعوات التعاون
// ActivityLogDrawer.tsx موجود — يعرض سجل الأحداث
// react-hot-toast مثبت — نظام Toast موجود
```

#### غائب تماماً ❌

```
❌ Push Notification API — لا Web Push في package.json
❌ Service Worker    — لا يوجد للاستقبال خارج التطبيق
❌ Notification Scheduler — لا cron أو timer لأعياد الميلاد
❌ FCM/Firebase Messaging — firebase مثبت لكن ليس للـ Push
❌ Notification Center UI — لا مكان لعرض الإشعارات المتراكمة
❌ Notification Preferences — لا إعدادات تحكم ما يظهر وما يُخفى
```

**الخلاصة:** البنية التحتية للإشعارات **الداخلية** موجودة جزئياً وتحتاج ربطاً.
الإشعارات **الخارجية** (Push) تحتاج بناءً كاملاً من الصفر.

---

### 2. تصنيف الإشعارات المطلوبة

#### النوع الأول: إشعارات التفاعل الفوري (Real-time)
*المصدر: Supabase Realtime — يعمل جزئياً بالفعل*

```
دعوات التعاون:
  "أرسل لك محمود دعوة للمشاركة في شجرة العائلة"
  → خيار: [قبول] [رفض] داخل الإشعار مباشرة

ردود الدعوات:
  "قبِل عبدالله دعوتك للمشاركة"
  "رفض أيهم دعوتك للمشاركة"

تحديثات المتعاونين (للمالك والمحررين):
  "أضاف أيهم صورة جديدة للجد رمضان"
  "عدّل محمود تاريخ ميلاد عبدالله بن حمد"
  "حذف خالد شخصاً من الشجرة" ← حساس، يظهر دائماً
```

#### النوع الثاني: إشعارات المناسبات (Scheduled)
*المصدر: حسابات من birthDate + date-fns — يحتاج scheduler*

```
أعياد الميلاد:
  "🎂 اليوم عيد ميلاد الجد رمضان — لو كان حياً لأتم 87 عاماً"
  "🎂 عيد ميلاد سارة خالد بعد 3 أيام"

ذكريات الوفاة:
  "🕊️ اليوم ذكرى وفاة الجدة فاطمة — رحمها الله"

ذكريات الزواج:
  "💍 ذكرى زواج عبدالله ومريم — 32 عاماً"
```

---

### 3. المعمارية المعتمدة

#### طبقة الإشعارات (Notification Layers)

```
┌─────────────────────────────────────────────┐
│           المستخدم يرى الإشعار             │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │   Notification      │   ← طبقة العرض
    │   Bell + Center     │     (مكوّن جديد في الهيدر)
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  useNotifications() │   ← Hook موحد
    │  (hook موجود جزئياً)│     يجمع كل المصادر
    └──────┬──────────┬───┘
           │          │
    ┌──────▼──┐  ┌────▼──────────────┐
    │Supabase │  │ Scheduled Engine  │
    │Realtime │  │ (date-fns based)  │
    │(موجود) │  │ (يُبنى من صفر)   │
    └─────────┘  └───────────────────┘
```

---

### 4. مصدر البيانات لكل نوع

#### إشعارات Realtime — من Supabase

```typescript
// يستخدم treeInvitationService.ts الموجود
// مع إضافة channel للتعديلات

// القناة الموجودة: invitation events
// القناة الجديدة: tree_changes events

supabase
  .channel(`tree-changes-${treeId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'people' },
    (payload) => {
      // حوّل الحدث إلى إشعار مقروء
      const notification = buildChangeNotification(payload, people);
      addNotification(notification);
    }
  )
  .subscribe();
```

#### إشعارات المناسبات — من date-fns

```typescript
// date-fns مثبتة — لا مكتبات جديدة

import { isToday, isFuture, differenceInDays } from 'date-fns';

function checkBirthdays(people: Record<string, Person>): ScheduledNotification[] {
  const today = new Date();
  const notifications: ScheduledNotification[] = [];

  Object.values(people).forEach(person => {
    if (!person.birthDate) return;

    const birthday = new Date(person.birthDate);
    // نفس اليوم والشهر من هذا العام
    const thisYearBirthday = new Date(
      today.getFullYear(),
      birthday.getMonth(),
      birthday.getDate()
    );

    if (isToday(thisYearBirthday)) {
      notifications.push({
        type: 'birthday-today',
        personId: person.id,
        personName: `${person.firstName} ${person.lastName}`,
        age: today.getFullYear() - birthday.getFullYear(),
        isDeceased: person.isDeceased,
      });
    }

    const daysUntil = differenceInDays(thisYearBirthday, today);
    if (daysUntil > 0 && daysUntil <= 3) {
      notifications.push({
        type: 'birthday-upcoming',
        personId: person.id,
        daysUntil,
      });
    }
  });

  return notifications;
}
```

---

### 5. هيكل الـ Types الجديدة

```typescript
// يُضاف إلى types.ts

type NotificationType =
  | 'invitation-received'    // دعوة تعاون واردة
  | 'invitation-accepted'    // قبول دعوة أرسلتها
  | 'invitation-rejected'    // رفض دعوة أرسلتها
  | 'tree-change'            // تعديل من متعاون
  | 'birthday-today'         // عيد ميلاد اليوم
  | 'birthday-upcoming'      // عيد ميلاد قادم (3 أيام)
  | 'death-anniversary'      // ذكرى وفاة
  | 'marriage-anniversary';  // ذكرى زواج

interface AppNotification {
  id: string;                 // uuid
  type: NotificationType;
  title: string;              // "عيد ميلاد رمضان خالد"
  body: string;               // "لو كان حياً لأتم 87 عاماً"
  personId?: string;          // للتنقل المباشر للشخص
  treeId?: string;
  timestamp: Date;
  isRead: boolean;
  isDismissed: boolean;
  dedupKey: string;           // منع التكرار (موجود في NotificationTelemetry)
  action?: {
    type: 'accept-invite' | 'reject-invite' | 'navigate-person';
    payload: Record<string, string>;
  };
}
```

---

### 6. واجهة المستخدم — Notification Bell

**الموقع:** أيقونة جرس 🔔 في الهيدر، بين Search وThe Vault

```
الهيدر:
  [☰] [↩️↪️] [🌐] [🌙]  ←  [🔔 3]  [🛡️ ●]  [🎨] [👤]
                                ↑
                         Badge بعدد غير المقروء
```

**سلوك الجرس:**
```
بدون إشعارات    → 🔔 بدون badge
إشعار واحد +   → 🔔 مع نقطة حمراء
2+ إشعارات     → 🔔 مع رقم (9+ إذا تجاوز 9)
النقر           → يفتح Notification Center
```

---

### 7. Notification Center

**النمط:** Dropdown Panel (ليس Modal — لا يقطع العمل)
**العرض:** تحت أيقونة الجرس مباشرة، عرض 380px

```
┌────────────────────────────────────┐
│  الإشعارات              [تحديد الكل]│
├────────────────────────────────────┤
│ 🎂  عيد ميلاد رمضان خالد    اليوم  │
│     لو كان حياً لأتم 87 عاماً      │
│     [فتح الملف الشخصي]             │
├────────────────────────────────────┤
│ 👥  دعوة من محمود العمر    منذ 5د  │
│     يدعوك للمشاركة في شجرته        │
│     [قبول]  [رفض]                  │
├────────────────────────────────────┤
│ ✏️   أضاف أيهم صورة         منذ 1س │
│     للجد رمضان خالد                │
│     [عرض الشخص]                    │
├────────────────────────────────────┤
│          [عرض كل الإشعارات]        │
└────────────────────────────────────┘
```

**قواعد العرض:**
```
- آخر 5 إشعارات في الـ Dropdown
- الإشعارات غير المقروءة تظهر بخلفية مميزة
- النقر على إشعار = تعليمه مقروءاً + تنفيذ الإجراء
- "عرض كل الإشعارات" يفتح صفحة مستقلة داخل The Vault
```

---

### 8. إعدادات الإشعارات

**الموقع:** داخل The Vault → تبويب جديد "الإشعارات" أو ضمن إعدادات الشجرة

```
إشعارات التعاون
  ◉ دعوات التعاون الواردة          ← افتراضي: مفعّل
  ◉ قبول/رفض دعواتي               ← افتراضي: مفعّل
  ◉ تعديلات المتعاونين             ← افتراضي: مفعّل
    └── إشعار لكل تعديل           ← مزعج، افتراضي: معطّل
    └── ملخص يومي فقط             ← افتراضي: مفعّل

إشعارات المناسبات
  ◉ أعياد الميلاد (اليوم نفسه)     ← افتراضي: مفعّل
  ◉ تذكير قبل 3 أيام              ← افتراضي: مفعّل
  ◉ ذكريات الوفاة                  ← افتراضي: مفعّل
  ○ ذكريات الزواج                  ← افتراضي: معطّل

إشعارات الأشخاص المتوفين
  ◉ إظهار ذكريات المتوفين         ← افتراضي: مفعّل
  ○ إخفاء أعياد ميلاد المتوفين    ← افتراضي: معطّل
```

---

### 9. قواعد منع التكرار (Deduplication)

```typescript
// dedupKey يمنع ظهور نفس الإشعار مرتين

// للمناسبات:
const dedupKey = `birthday-${personId}-${year}`;
// نفس الشخص لا يحصل على إشعار عيد ميلاد أكثر من مرة في اليوم

// للتعاون:
const dedupKey = `change-${personId}-${changeType}-${hour}`;
// تغييرات متعددة على نفس الشخص في نفس الساعة = إشعار واحد

// للدعوات:
const dedupKey = `invitation-${invitationId}`;
// دعوة واحدة = إشعار واحد فقط
```

---

### 10. خارطة الملفات المطلوبة

#### ملفات جديدة
```
services/notificationService.ts       ← منطق الإشعارات المركزي
services/scheduledNotifications.ts    ← محرك المناسبات (date-fns)
hooks/useNotifications.ts             ← Hook موحد للواجهة
hooks/useRealtimeNotifications.ts     ← Supabase channel listener
components/Header/NotificationBell.tsx ← أيقونة الجرس + Badge
components/Header/NotificationCenter.tsx ← Dropdown Panel
```

#### ملفات تُعدَّل
```
types.ts                              ← إضافة AppNotification + NotificationType
store/useAppStore.ts                  ← إضافة notifications[] slice
components/Header/Header.tsx          ← إضافة NotificationBell
```

#### ملفات تُقرأ فقط (لا تُعدَّل)
```
treeInvitationService.ts             ← يُعاد توظيفه كمصدر بيانات
ActivityLogDrawer.tsx                 ← مرجع لنمط العرض
```

---

### 11. ترتيب التنفيذ

```
الأسبوع الأول — البنية التحتية:
  1. إضافة AppNotification + NotificationType إلى types.ts
  2. إضافة notifications[] slice إلى useAppStore
  3. بناء notificationService.ts (إضافة، قراءة، إخفاء، dedup)
  4. اختبارات وحدة لـ notificationService

الأسبوع الثاني — المناسبات:
  5. بناء scheduledNotifications.ts (birthday + death + marriage)
  6. ربطه بـ useAppStore عند تحميل التطبيق
  7. اختبار: شخص عيد ميلاده اليوم → يظهر الإشعار

الأسبوع الثالث — Realtime:
  8. بناء useRealtimeNotifications.ts (Supabase channel)
  9. ربط أحداث الدعوات بـ notificationService
  10. ربط أحداث التعديلات (tree_changes) بـ notificationService

الأسبوع الرابع — الواجهة:
  11. NotificationBell.tsx (أيقونة + Badge)
  12. NotificationCenter.tsx (Dropdown Panel)
  13. إعدادات الإشعارات في The Vault
  14. اختبار E2E: دعوة → إشعار → قبول → تأكيد
```

---

### 12. القيود التقنية المهمة

```
⚠️  Push Notifications خارج التطبيق:
    تتطلب Service Worker + Web Push API + PWA setup
    هذا خارج نطاق هذه المرحلة — يُنفَّذ مع ملحق PWA لاحقاً
    المرحلة الحالية: In-App Notifications فقط

⚠️  إشعارات أعياد الميلاد للمتوفين:
    الافتراضي هو الإظهار ("لو كان حياً لأتم 87 عاماً")
    قابل للإيقاف من إعدادات الإشعارات

⚠️  إشعارات التعاون للـ Viewer:
    Viewer يرى إشعارات الدعوات الواردة
    Viewer لا يرى إشعارات تعديلات الآخرين
    (لأنه غير معني بالمتابعة التشغيلية)

⚠️  الأداء مع العائلات الكبيرة:
    checkBirthdays() تُشغَّل مرة واحدة عند فتح التطبيق
    لا تُشغَّل في كل render
    النتيجة تُخزَّن في useAppStore وتنتهي صلاحيتها بعد منتصف الليل
```

---

*Notification System Spec v1 — معتمد: مارس 2026*
*جزء من: Jozor Final UI Blueprint*

---

## ملحق تقني — البنية التحتية الهجينة (Hybrid Backend Spec v1)

> هذا الملحق يحكم كل قرار متعلق بالـ Edge Functions والـ Push Notifications والـ Cron Jobs.
> يُقرأ قبل لمس أي ملف في /api أو /public أو Supabase migrations.

---

### 1. المشكلة الجوهرية — لماذا "الهجين"؟

```
التطبيق حالياً:
  ✅ يعمل ممتازاً داخل المتصفح
  ❌ يصمت تماماً عند إغلاق المتصفح
  ❌ مفتاح Gemini مكشوف في الـ client bundle
  ❌ لا scheduler يفحص أعياد الميلاد
  ❌ لا إشعارات خارجية للأجهزة

الحل: Hybrid Backend
  Vercel Edge Functions  ← الأمان + AI proxy
  Supabase Edge Functions + Cron ← الجدولة + Push trigger
  Service Worker (PWA) ← استقبال Push على الجهاز
```

**لماذا "هجين" وليس Backend كامل؟**
لأن 95% من منطق التطبيق يعمل بشكل ممتاز على الـ client. نحتاج Backend فقط لثلاثة أشياء:
إخفاء الأسرار، الجدولة الآلية، وإرسال Push خارج المتصفح.

---

### 2. Edge Functions المطلوبة

#### أ. api/ai-proxy — الأولوية القصوى

```typescript
// /api/ai-proxy.ts — Vercel Edge Function
// يستبدل الاستدعاء المباشر لـ Gemini من الـ frontend

export default async function handler(req: Request) {

  // 1. التحقق من المستخدم (Supabase JWT)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return new Response('Unauthorized', { status: 401 });

  const { data: user } = await supabaseAdmin.auth.getUser(token);
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 2. استقبال الطلب من الـ frontend
  const { message, treeContext } = await req.json();

  // 3. إرسال لـ Gemini بالمفتاح المخفي
  const response = await fetch('https://generativelanguage.googleapis.com/...', {
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY, // ← مخفي تماماً
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] }),
  });

  return new Response(response.body, { status: response.status });
}

// Environment Variables المطلوبة في Vercel:
// GEMINI_API_KEY=...
// SUPABASE_SERVICE_ROLE_KEY=...  (للتحقق من المستخدم)
```

---

#### ب. api/push-notifier — إرسال Push للأجهزة

```typescript
// /api/push-notifier.ts — Vercel Edge Function
// يستخدم web-push لإرسال إشعار لجهاز محدد

import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@jozor.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: Request) {

  // يُستدعى من: Supabase Cron أو Supabase Edge Function
  // يستقبل: userId + notification payload

  const { userId, notification } = await req.json();

  // جلب subscriptions المستخدم من Supabase
  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh_key, auth_key')
    .eq('user_id', userId);

  // إرسال لكل جهاز مسجل
  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
        JSON.stringify(notification)
      )
    )
  );

  return Response.json({ sent: results.filter(r => r.status === 'fulfilled').length });
}

// Environment Variables المطلوبة:
// VAPID_PUBLIC_KEY=...
// VAPID_PRIVATE_KEY=...
// SUPABASE_SERVICE_ROLE_KEY=...
```

---

### 3. جدول Supabase المطلوب — push_subscriptions

```sql
-- supabase/migrations/20260301_push_subscriptions.sql

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh_key  TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',   -- 'web' | 'android' | 'ios'
  user_agent  TEXT,                 -- للتشخيص فقط
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_used   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint)         -- جهاز واحد = subscription واحد
);

-- Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- المستخدم يرى subscriptions نفسه فقط
CREATE POLICY "user_own_subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Edge Functions يمكنها القراءة الكاملة (service role)
-- لا تحتاج policy لأنها تستخدم service_role_key
```

---

### 4. Supabase Cron — Birthday Scheduler

```sql
-- يُضاف في Supabase Dashboard → Database → Extensions → pg_cron

-- تشغيل كل يوم الساعة 8 صباحاً (UTC+3 = 5 UTC)
SELECT cron.schedule(
  'birthday-checker',
  '0 5 * * *',
  $$
    SELECT
      net.http_post(
        url := 'https://jozor.vercel.app/api/push-notifier',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_key') || '"}'::jsonb,
        body := json_build_object(
          'type', 'birthday-check',
          'date', CURRENT_DATE
        )::text
      )
    FROM (SELECT 1) t
    WHERE EXISTS (
      SELECT 1 FROM people
      WHERE EXTRACT(MONTH FROM birthdate::date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM birthdate::date) = EXTRACT(DAY FROM CURRENT_DATE)
    );
  $$
);
```

**ملاحظة:** الـ Cron يُشغَّل فقط إذا وجد مطابقة — لا استدعاء فارغ كل يوم.

---

### 5. Service Worker — PWA Foundation

```javascript
// /public/sw.js
// يعيش في /public — لا يُعالجه Vite

const CACHE_NAME = 'jozor-v1';

// استقبال Push من الخادم
self.addEventListener('push', event => {
  if (!event.data) return;

  const notification = event.data.json();

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: '/logo.webp',
      badge: '/logo.webp',
      tag: notification.dedupKey,          // منع التكرار على مستوى الجهاز
      data: {
        personId: notification.personId,
        url: notification.url || '/',
      },
      actions: notification.actions || [],  // [قبول] [رفض] للدعوات
    })
  );
});

// النقر على الإشعار → فتح التطبيق على الصفحة الصحيحة
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // إذا التطبيق مفتوح → انقله للصفحة المطلوبة
      const existingClient = clientList.find(c => c.url.includes(self.location.origin));
      if (existingClient) {
        existingClient.focus();
        existingClient.postMessage({ type: 'navigate', url: targetUrl });
        return;
      }
      // إذا مغلق → افتحه
      clients.openWindow(targetUrl);
    })
  );
});
```

---

### 6. تسجيل الجهاز في Frontend

```typescript
// hooks/usePushSubscription.ts
// يُشغَّل مرة عند تسجيل الدخول

export function usePushSubscription() {

  const { user } = useAuthStore();

  const subscribe = async () => {
    // 1. التحقق من دعم المتصفح
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // 2. طلب إذن المستخدم
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // 3. تسجيل Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');

    // 4. الاشتراك في Push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY, // ← public key فقط في frontend
    });

    const sub = subscription.toJSON();

    // 5. حفظ الـ subscription في Supabase
    await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.uid,
        endpoint: sub.endpoint,
        p256dh_key: sub.keys?.p256dh,
        auth_key: sub.keys?.auth,
        device_type: 'web',
        last_used: new Date().toISOString(),
      }, {
        onConflict: 'user_id, endpoint'  // تحديث بدل إضافة مكررة
      });
  };

  return { subscribe };
}
```

---

### 7. Environment Variables الكاملة

#### Vercel (لا تظهر في الـ client bundle)
```
GEMINI_API_KEY=              ← مفتاح Gemini — سري تماماً
VAPID_PRIVATE_KEY=           ← مفتاح Push الخاص — سري تماماً
SUPABASE_SERVICE_ROLE_KEY=   ← Supabase admin key — سري تماماً
```

#### Frontend (.env.local — تُحزَّم في الـ bundle لكن آمنة)
```
VITE_SUPABASE_URL=           ← URL عام
VITE_SUPABASE_ANON_KEY=      ← مفتاح عام مصمم للـ client
VITE_GOOGLE_CLIENT_ID=       ← عام
VITE_VAPID_PUBLIC_KEY=       ← Public key فقط — مصمم للـ client
```

**القاعدة الذهبية:**
```
أي متغير بيئة بدون VITE_ → يعيش في Vercel فقط → لا يصل للمتصفح أبداً
أي متغير بيئة بـ VITE_   → يُحزَّم في الـ bundle → يجب أن يكون آمناً للعرض
```

---

### 8. خارطة الملفات الجديدة

```
المطلوب إنشاؤه:
  /api/ai-proxy.ts               ← Vercel Edge Function
  /api/push-notifier.ts          ← Vercel Edge Function
  /public/sw.js                  ← Service Worker
  /public/manifest.json          ← PWA Manifest
  /hooks/usePushSubscription.ts  ← تسجيل الجهاز
  /supabase/migrations/
    20260301_push_subscriptions.sql

المطلوب تعديله:
  /services/geminiService.ts     ← يُغيَّر endpoint من Gemini مباشرة إلى /api/ai-proxy
  /index.html                    ← إضافة <link rel="manifest">
  /index.tsx                     ← تسجيل Service Worker عند بدء التطبيق

المحذوف من الـ client:
  أي import مباشر لـ @google/generative-ai من الـ frontend
  أي مكان يحتوي على GEMINI_API_KEY في الـ client code
```

---

### 9. ترتيب تنفيذ هذا الملحق

```
الأسبوع الأول — الأمان (أولوية قصوى):
  1. إنشاء api/ai-proxy.ts
  2. نقل GEMINI_API_KEY إلى Vercel Environment Variables
  3. تحديث geminiService.ts ليستدعي /api/ai-proxy
  4. التحقق: npm run typecheck + اختبار يدوي للـ AI Chat
  5. التأكد: لا يوجد GEMINI_API_KEY في أي ملف client

الأسبوع الثاني — البنية التحتية:
  6. إنشاء migration لـ push_subscriptions
  7. إنشاء /public/sw.js + /public/manifest.json
  8. إنشاء hooks/usePushSubscription.ts
  9. توليد VAPID keys وإضافتها لـ Vercel + .env.local

الأسبوع الثالث — Push Engine:
  10. إنشاء api/push-notifier.ts
  11. إضافة web-push dependency
  12. اختبار: إرسال Push يدوي لجهاز اختبار

الأسبوع الرابع — Birthday Scheduler:
  13. تفعيل pg_cron في Supabase
  14. إعداد Cron job للفحص اليومي
  15. اختبار end-to-end: تاريخ ميلاد اليوم → Push يصل للجهاز
```

---

### 10. القيود والتحفظات

```
⚠️  iOS Push Notifications:
    تتطلب iOS 16.4+ وتثبيت التطبيق على الـ Home Screen
    لا تعمل في Safari العادي بدون تثبيت
    يجب إخبار المستخدم بهذا القيد عند طلب الإذن

⚠️  Supabase Cron متاح في Pro Plan فقط:
    Free Plan لا يدعم pg_cron
    البديل المؤقت للـ Free Plan: Vercel Cron (مجاني حتى حد معين)

⚠️  web-push في Edge Functions:
    بعض Edge runtimes لا تدعم Node.js crypto module الذي تعتمد عليه web-push
    الحل: استخدام @edge-runtime/ponyfill أو التحويل لـ Serverless Function عادية

⚠️  تنظيف Subscriptions المنتهية:
    عند فشل إرسال Push (جهاز قديم أو المستخدم ألغى الإذن)
    يجب حذف الـ subscription من push_subscriptions تلقائياً
    يُنفَّذ في api/push-notifier عند استقبال 410 Gone من الجهاز
```

---

*Hybrid Backend Spec v1 — معتمد: مارس 2026*
*جزء من: Jozor Final UI Blueprint*

---

## ملحق تقني — وضع الخصوصية والأيقونات العمرية (Privacy Mode Spec v1)

> يُقرأ عند تنفيذ Privacy Mode في Appearance Lab أو Node component.

---

### 1. تعريف Privacy Mode

وضع العرض العام هو toggle موحد يستبدل **كل صور الأشخاص** في الشجرة بأيقونات رمزية تعكس الجنس والفئة العمرية فقط. لا يُخفي البيانات النصية.

```
privacyMode = false (افتراضي)  → تظهر الصورة الشخصية
privacyMode = true              → تظهر الأيقونة الرمزية
showPhotos = false              → لا صورة ولا أيقونة (فراغ)

القاعدة: Privacy Mode > showPhotos
إذا privacyMode = true → يُتجاهل showPhotos ويُعرض الـ Placeholder دائماً
```

---

### 2. منطق اختيار الأيقونة

```typescript
// utils/avatarUtils.ts

type AgeGroup = 'child' | 'youth' | 'adult' | 'senior';

function getAgeGroup(birthDate: string, deathDate?: string): AgeGroup {
  if (!birthDate) return 'adult'; // افتراضي عند غياب التاريخ

  const referenceDate = deathDate ? new Date(deathDate) : new Date();
  const birth = new Date(birthDate);
  const age = referenceDate.getFullYear() - birth.getFullYear();

  if (age <= 12) return 'child';   // 0–12
  if (age <= 20) return 'youth';   // 13–20
  if (age <= 60) return 'adult';   // 21–60
  return 'senior';                  // 60+
}

function getPlaceholderIcon(
  gender: 'male' | 'female',
  ageGroup: AgeGroup
): LucideIcon {

  // أيقونات من lucide-react — موجودة، لا إضافة مكتبات
  const icons = {
    male: {
      child:  Baby,        // lucide-react
      youth:  User,        // lucide-react
      adult:  UserCheck,   // lucide-react
      senior: User,        // مع modifier CSS (شعر أبيض)
    },
    female: {
      child:  Baby,
      youth:  User,
      adult:  UserCheck,
      senior: User,
    },
  };

  return icons[gender][ageGroup];
}
```

**قاعدة المكتبات:** جميع الأيقونات من `lucide-react` المثبتة. لا `Avataaars`، لا `IconScout`، لا تحميل SVG خارجي.

---

### 3. تمييز الجنس بالألوان (بدل الملامح)

بما أن الأيقونات بسيطة، يُميَّز الجنس بلون خلفية البطاقة وفق `boxColorLogic` الموجود:

```
ذكر   → خلفية زرقاء فاتحة (--node-male-bg)
أنثى  → خلفية وردية فاتحة (--node-female-bg)
```

هذا يعمل تلقائياً مع النظام الحالي — لا كود إضافي.

---

### 4. الأداء

```typescript
// في TreeNode component:

const imageSrc = useMemo(() => {
  if (privacyMode) return null;        // ← لا يُحمَّل URL نهائياً
  if (!showPhotos) return null;
  return person.photoUrl ?? null;
}, [privacyMode, showPhotos, person.photoUrl]);

// النتيجة: عند privacyMode = true
// لا HTTP request للصورة
// لا <img> في DOM
// توفير كامل في استهلاك البيانات
```

---

### 5. الملف المستهدف للتنفيذ

```
يُضاف إلى:
  constants.ts          ← إضافة privacyMode: false في DEFAULT_TREE_SETTINGS
  types.ts              ← إضافة privacyMode?: boolean في TreeSettings
  utils/avatarUtils.ts  ← دالة getAgeGroup() + getPlaceholderIcon() [ملف جديد]
  components/TreeCanvas/TreeNode.tsx ← تطبيق المنطق في render

Feature في FEATURE_MAP.md:
  tree-rendering        ← Privacy Mode يؤثر على الرسم
  settings              ← الـ toggle في Appearance Lab
```

---

## ملحق تقني — استمرارية الجلسة (Session Persistence Spec v1)

> هذا ليس feature جديدة — هو إصلاح لثغرة في دورة حياة الـ Auth.
> يُقرأ عند أي تعديل على useAuthStore أو supabaseClient أو App.tsx.

---

### 1. المشكلة

```
المستخدم يسجل دخوله → Zustand يحفظ user في الذاكرة
المستخدم يُحدّث الصفحة → Zustand يُعاد من صفر → user = null
التطبيق يظن المستخدم غير مسجل → يطلب تسجيل دخول جديد

الحقيقة: Supabase يحتفظ بالجلسة في localStorage تلقائياً
المشكلة: لا أحد يقرأ هذه الجلسة عند إعادة تشغيل التطبيق
```

---

### 2. الحل — ترتيب التهيئة الصحيح

```typescript
// supabaseClient.ts أو App.tsx — يُشغَّل مرة واحدة عند بدء التطبيق

// الخطوة 1: قراءة الجلسة من localStorage عند البدء
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  // الجلسة موجودة — حدّث Zustand فوراً
  useAuthStore.getState().setUser(session.user);
  useAuthStore.getState().setSyncStatus('synced');
} else {
  // لا جلسة — المستخدم يحتاج تسجيل دخول
  useAuthStore.getState().setUser(null);
}

// الخطوة 2: استمع لأي تغيير مستقبلي في الجلسة
supabase.auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      useAuthStore.getState().setUser(session!.user);
      break;
    case 'SIGNED_OUT':
      useAuthStore.getState().setUser(null);
      useAuthStore.getState().setSyncStatus('offline');
      break;
    case 'TOKEN_REFRESHED':
      // Supabase يجدد الـ token تلقائياً — لا حاجة لتدخل
      break;
  }
});
```

---

### 3. ربط Status Dot بدورة حياة الجلسة

```typescript
// الحالات المرئية للمستخدم خلال تسلسل التهيئة:

التطبيق يفتح للمرة الأولى:
  ⚪ رمادي → "جاري التحقق من الجلسة..."  (أقل من 500ms)
  ↓
  🟢 أخضر  → "متزامن" (إذا وُجدت جلسة محفوظة)
  ↓ أو
  ⚫ بدون dot → شاشة الترحيب (إذا لم توجد جلسة)

// لا يُعرض login modal تلقائياً عند الـ refresh
// المستخدم يرى شجرته مباشرة إذا كانت لديه جلسة محفوظة
```

---

### 4. إعدادات Supabase المطلوبة

```
في Supabase Dashboard → Authentication → URL Configuration:

Site URL:
  https://jozor.vercel.app

Redirect URLs (أضف الجميع):
  https://jozor.vercel.app/**
  http://localhost:5173/**     ← للتطوير المحلي
  http://localhost:4173/**     ← للـ preview
```

```
في Google Cloud Console → OAuth 2.0 Credentials:

Authorized redirect URIs (أضف):
  https://[your-project].supabase.co/auth/v1/callback
  http://localhost:5173
```

---

### 5. قاعدة لوكيل الذكاء الاصطناعي

```
عند أي تعديل على ملفات الـ Auth:

✅ getSession() يُستدعى عند بدء التطبيق — قبل render الـ Router
✅ onAuthStateChange() listener لا يُزال أبداً (بدون cleanup = memory leak)
✅ Zustand setUser() يُستدعى فقط من onAuthStateChange — لا من أي مكان آخر
❌ لا تحفظ JWT token يدوياً في localStorage — Supabase يفعل ذلك تلقائياً
❌ لا تعتمد على Zustand وحده للتحقق من الـ auth — دائماً راجع Supabase
```

---

*Privacy Mode Spec v1 + Session Persistence Spec v1 — معتمد: مارس 2026*
*جزء من: Jozor Final UI Blueprint*
