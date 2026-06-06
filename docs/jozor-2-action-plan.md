# Jozor 2.x Action Plan

هذه الوثيقة تحول خطة تطوير واستقرار Jozor 2.x إلى خطة عمل تنفيذية قابلة للمتابعة. الهدف ليس إعادة بناء المشروع، بل التحرك بالتدرج:

`Stabilize -> Simplify -> Scale`

## قواعد التنفيذ

1. لا يوجد rewrite شامل.
2. لا ندمج تغييرات كبيرة في الرسم، المزامنة، orchestration، وstate management في نفس الحزمة.
3. كل محور يخرج في PR مستقل أو commit series واضحة.
4. كل مرحلة يجب أن تنتهي بمعايير قبول قابلة للاختبار.
5. أي تغيير في sync أو rendering يحتاج rollback plan قبل الدمج.

## خط العمل المقترح

الفرع المقترح للمرحلة:

```text
stabilization/jozor-2
```

يبقى `main` مستقرًا، وتدخل إليه الحزم بعد تحقق مستقل.

## المرحلة 0: تثبيت خط الأساس

الأولوية: حرجة  
الهدف: منع regressions قبل لمس الطبقات الحساسة.

### المهام

- إنشاء `docs/smoke-test-checklist.md` واعتماده كخط تحقق أولي.
- توثيق مسار تحقق ثابت لكل PR.
- تحديد baseline performance للأشجار الصغيرة والمتوسطة والكبيرة.
- تسجيل known issues الحالية حتى لا تختلط بالانحدارات الجديدة.

### Smoke checklist

- فتح التطبيق.
- فتح شجرة موجودة.
- إنشاء شجرة جديدة.
- إضافة شخص.
- حذف شخص.
- تعديل علاقة.
- undo / redo.
- تسجيل الدخول والخروج.
- فتح The Vault.
- إنشاء نسخة احتياطية Google Drive.
- استعادة نسخة احتياطية.
- مشاركة شجرة.
- قبول دعوة مشاركة.
- فتح المحادثات.
- تصدير JSON / Jozor / PNG أو PDF.

### معايير القبول

- `npm run typecheck` أو `npx tsc --noEmit --pretty false` ينجح.
- `npm run build` ينجح.
- الاختبارات الحالية تنجح.
- smoke checklist موثقة وقابلة للتكرار عبر `docs/smoke-test-checklist.md`.

## المرحلة 1: استقرار TypeScript والنواة

الأولوية: حرجة جدًا  
الهدف: تقليل الأخطاء الصامتة قبل توسيع الأداء والمزامنة.

### 1. تقليل `any`

#### المهام

- حصر `as any` و`(state: any)` حسب المجلد.
- البدء بالمناطق الأقل خطورة:
  - `utils`
  - `services`
  - `features/admin`
- تأجيل المناطق الحساسة إلى حزم مستقلة:
  - sync
  - rendering
  - AI integration
  - store slices

#### التدرج

1. تشغيل تقرير فقط لعدد `any`.
2. تنظيف ملفات منخفضة الخطورة.
3. تفعيل `noUnusedLocals`.
4. تنظيف النتائج.
5. تفعيل `noUnusedParameters`.
6. تنظيف النتائج.

#### معايير القبول

- لا يتم تفعيل strict flags إلا بعد نجاح build.
- كل حزمة تقلل `any` ولا تغير behavior.
- وجود اختبار أو type-level coverage للمناطق المعدلة.

### 2. توحيد منطق العلاقات

#### المشكلة

منطق العلاقات موزع بين:

- `domain/familyTreeOperations.ts`
- `syncUtils.ts`
- `relationshipRules.ts`
- مسارات import/sync مختلفة

#### الهدف

إنشاء Domain Reducer موحد تمر عبره عمليات تعديل الشجرة.

#### المهام

- حصر كل عمليات العلاقات الحالية.
- تعريف `TreeDomainOperation`.
- تعريف reducer pure بدون side effects.
- إضافة اختبارات لعلاقات الأب/الأم/الزوج/الابن/الحذف.
- تحويل مسار واحد فقط أولًا لاستخدام reducer.
- بعد الاستقرار، تحويل باقي المسارات تدريجيًا.

#### معايير القبول

- نفس العملية تعطي نفس النتيجة من المحلي والمزامنة والاستيراد.
- لا توجد كتابة مباشرة للعلاقات في مسارات جديدة خارج domain reducer.

## المرحلة 2: استقرار الرسم والأداء

الأولوية: عالية  
الهدف: جعل الرسم قابلًا للتوسع مع الأشجار الكبيرة.

### 3. توحيد مصدر layout

#### المشكلة

احتمال تكرار الحساب بين:

- `layout.worker.ts`
- `useV3RendererPipeline`

#### الهدف

`Worker = Single Source of Layout Truth`

#### المهام

- رسم خريطة تدفق layout الحالي.
- تحديد الحسابات المتكررة.
- إنشاء عقد واضح بين UI والWorker.
- نقل الحسابات الثقيلة إلى worker فقط.
- إبقاء UI للرسم والتفاعل فقط.

#### معايير القبول

- لا يوجد حساب layout ثقيل داخل render path.
- تغير البيانات يعيد حساب layout مرة واحدة فقط.
- قياس FPS قبل/بعد على شجرة كبيرة.

### 4. Rendering حسب مستوى الزوم

#### المهام

- تعريف مستويات عرض:
  - far zoom: SVG lightweight nodes.
  - normal zoom: compact cards.
  - close zoom: full cards.
- تحديد threshold لكل مستوى.
- منع `foreignObject` عند الزوم البعيد.
- إضافة اختبار بصري أو runtime smoke.

#### معايير القبول

- الأشجار الكبيرة لا ترسم كل البطاقات الكاملة عند الزوم البعيد.
- لا يحدث فقدان تفاعل أساسي عند تغيير الزوم.

### 5. Viewport culling

#### المهام

- حساب bounds للviewport.
- عدم رسم nodes خارج viewport مع هامش buffer.
- الحفاظ على edges الأساسية أو تبسيطها حسب الزوم.
- قياس عدد DOM/SVG nodes قبل وبعد.

#### معايير القبول

- انخفاض واضح في DOM nodes خارج الشاشة.
- لا تظهر قفزات بصرية مزعجة أثناء التحريك.

## المرحلة 3: المزامنة والتعاون

الأولوية: عالية جدًا لكن بعد استقرار النواة  
الهدف: منع flickering وrollback وتضارب الحالة.

### 6. Pending Operations Projection

#### النموذج المستهدف

```text
Base Confirmed State
+ Pending Local Operations
= Projected UI State
```

#### المهام

- تعريف confirmed state.
- تعريف pending queue.
- إسقاط العمليات المحلية فوق الحالة المؤكدة.
- منع overwrite مباشر من remote updates على UI state.

#### معايير القبول

- عند وصول تحديث remote لا تختفي تعديلات المستخدم المحلية.
- لا يوجد UI jumping أثناء المزامنة.

### 7. Transaction Replay Layer

#### المهام

- تعريف replay contract.
- إعادة تطبيق pending operations بعد:
  - reconnect
  - sync refresh
  - remote updates
- إضافة اختبارات لحالات offline/online.

#### معايير القبول

- العمليات المحلية لا تضيع بعد refresh أو reconnect.
- conflicts يتم كشفها أو حلها وفق سياسة واضحة.

### 8. Sync checkpoints

#### المشكلة

`tree_operations` قد ينمو بلا حدود.

#### المهام

- تحديد checkpoint schema.
- حفظ snapshot دوري.
- تحميل آخر snapshot ثم تطبيق العمليات اللاحقة فقط.
- إضافة retention للعمليات القديمة بعد checkpoint آمن.

#### معايير القبول

- فتح شجرة كبيرة لا يعتمد على replay كامل منذ البداية.
- يوجد rollback path قبل حذف العمليات القديمة.

## المرحلة 4: تنظيف orchestration

الأولوية: متوسطة بعد تثبيت sync/rendering  
الهدف: تقليل التعقيد ومنع انفجار الترابط.

### 9. تفكيك App orchestration

#### المناطق المستهدفة

- `AppUIManager`
- `useAppOrchestration`
- modals/render coordinators

#### التقسيم المقترح

- `AuthCoordinator`
- `TreeCoordinator`
- `SyncCoordinator`
- `UIOverlayCoordinator`

#### المهام

- قياس مسؤوليات الملفات الحالية.
- استخراج coordinator واحد فقط في كل حزمة.
- الحفاظ على public API الحالي مؤقتًا.
- إضافة اختبارات smoke للفتح والإغلاق والتنقل.

#### معايير القبول

- لا يكبر `AppUIManager` مع الميزات الجديدة.
- كل coordinator له مسؤولية واحدة قابلة للاختبار.

## المرحلة 5: تحسينات طويلة المدى

الأولوية: لاحقة  
الهدف: تجهيز المشروع للنمو الكبير.

### 10. SVG engine

خيارات الدراسة:

- virtualization.
- canvas hybrid rendering.
- WebGL fallback.

لا يبدأ التنفيذ قبل قياس bottlenecks الفعلية.

### 11. AI layer

#### المهام

- تقوية type safety.
- توثيق privacy pipeline.
- validation للمدخلات والمخرجات.
- اعتماد structured outputs حيث يلزم.
- عدم السماح بأي auto-injection للمنطق.

### 12. Diagnostics

#### المهام

- runtime diagnostics.
- sync diagnostics.
- rendering metrics.
- performance tracing.
- Admin/owner reports للقياسات المهمة فقط.

## ترتيب التنفيذ العملي

### الحزمة A: Baseline

- Smoke checklist.
- CI/PR verification checklist.
- Performance baseline.

### الحزمة B: TypeScript hygiene

- تقرير `any`.
- تنظيف منخفض الخطورة.
- `noUnusedLocals`.
- `noUnusedParameters`.

### الحزمة C: Domain reducer design

- inventory للعلاقات.
- contract للعمليات.
- reducer pure.
- اختبارات العلاقات.

### الحزمة D: Layout pipeline audit

- خريطة تدفق layout.
- إثبات أماكن التكرار.
- خطة نقل إلى worker.

### الحزمة E: Large tree rendering

- zoom-level rendering.
- culling.
- قياسات FPS وDOM nodes.

### الحزمة F: Sync projection

- confirmed state.
- pending operations.
- replay.
- checkpoints.

### الحزمة G: Orchestration cleanup

- استخراج coordinators تدريجيًا.
- اختبارات regression.

## المخاطر الأعلى

1. توحيد العلاقات قد يكسر sync/import إذا تم دفعة واحدة.
2. نقل layout إلى worker قد يكسر التفاعل أو تموضع العقد.
3. Pending projection قد يخفي conflicts إذا لم توجد سياسة واضحة.
4. تفكيك orchestration مبكرًا قد يسبب regressions واسعة.

## ضوابط منع المخاطر

- لا تنفيذ واسع بدون inventory.
- لا تغيير behavior مع refactor إلا إذا كان مقصودًا وموثقًا.
- كل مرحلة تحتاج tests قبل وبعد.
- الأداء يقاس بأرقام لا بالانطباع.
- أي migration أو sync change يحتاج rollback plan.

## تعريف "تم"

تعتبر المرحلة مكتملة عندما يتحقق التالي:

- الاختبارات تمر.
- build يمر.
- smoke checklist تمر.
- لا توجد regressions معروفة جديدة.
- تم توثيق القرار أو التغيير في `docs/project-log.md` أو وثيقة المرحلة.
- تم دفع الحزمة في commit/PR واضح ومحصور.
## Implementation Log

### 2026-06-06 - Layout Core Performance Baseline

- Added `npm run test:layout:perf` for a repeatable V3 layout pipeline baseline.
- The baseline measures pure layout computation through `computeV3PipelineData`, not browser FPS or SVG DOM cost.
- Current local sample from `src/domain/__tests__/familyGraphPerformance.test.ts`:
  - 100 synthetic people: about 25ms
  - 500 synthetic people: about 34ms
  - 1000 synthetic people: about 80ms
- Interpretation:
  - The pure layout core is currently fast enough for the tested synthetic range.
  - The next performance risk is more likely browser rendering cost, SVG/DOM node count, `foreignObject`, viewport culling, and interaction paint work.
- Guardrail:
  - Keep this test as an early warning before changing layout/routing.
  - Do not treat it as proof of 60 FPS; browser-level verification still needs Playwright/runtime measurements.

### 2026-05-26 - Phase 0/1 Baseline and Domain Reducer Entry Point

- Added `docs/smoke-test-checklist.md` and refreshed the Playwright smoke suite against the current UI.
- Added `src/domain/FamilyDomainReducer.ts` as the first pure domain reducer surface.
- Moved relationship mutation helpers from `src/utils/treeOperations.ts` to `src/domain/familyTreeOperations.ts`.
- Routed `src/utils/syncUtils.ts` through the domain reducer to remove duplicated remote relationship mutation logic.
- Routed `src/store/slices/familySlice.ts` core person/relationship mutations through the same reducer surface.
- Added reducer characterization tests for remote parent links, delete cleanup, and relationship id deduplication.
- Started low-risk `any` cleanup in admin/settings and media utility surfaces without behavior changes.
- Verified with targeted reducer/sync tests, TypeScript check, production build, and the Playwright smoke suite.
