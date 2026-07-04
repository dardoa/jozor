# Private Beta Communications Pack - 2026-07-04

This document compiles the communication templates, feedback channels, and launching checklists for the first cohort of private beta testers.

---

## 1. Invitation Message Templates

### Arabic Version (النسخة العربية)
```text
مرحباً بك في النسخة التجريبية الخاصة من "جذور" (Jozor 2.0) 🌱

يسعدنا جداً اختيارك لتكون من بين أوائل الأشخاص الذين يشاركوننا رحلة اختبار وتطوير منصتنا الجديدة لحفظ إرث وتاريخ العوائل بخصوصية تامة.

قبل أن تبدأ، يرجى قراءة دليل المختبرين المرفق بعناية. نظراً لأننا في مرحلة تجريبية خاصة (Private Beta):
- يرجى استخدام بيانات عائلية اختبارية أو ملفات GEDCOM منسوخة، وليس الشجرة الأساسية الوحيدة لديك.
- يُحظر رفع وثائق هوية رسمية أو صور خاصة وحساسة.
- يمكنك اختبار المساعد الذكي "كيندي"، الخرائط الجغرافية الكسولة، وصياغة مخطوطة العائلة، بالإضافة إلى تجربة الترقية الافتراضية عبر بيئة Paddle Sandbox (دون دفع أي مبالغ حقيقية).

رابط الدخول: [رابط النشر الخاص بالتطبيق]
دليل المختبرين: [رابط دليل المختبرين]

يسعدنا استقبال ملاحظاتك واقتراحاتك مباشرة عبر رابط نموذج الملاحظات. شكراً لثقتك ودعمك!
```

### English Version
```text
Welcome to the Private Beta of Jozor (Jozor 2.0) 🌱

We are thrilled to invite you as one of our first closed private beta testers to explore our family heritage platform.

Before you begin, please read the attached Tester Guide carefully. As this is a private beta:
- Please use copied/synthetic family data or a duplicated GEDCOM file rather than your primary primary family records.
- Do not upload legal identity documents or sensitive private media.
- You can test Kindi AI assistant, geographic migration paths, family manuscripts, and trigger upgrades using the Paddle Sandbox overlay (without real payments).

Access URL: [Staging App URL]
Tester Guide: [Tester Guide URL]

Please submit any bugs or suggestions via our feedback form. Thank you for your support!
```

---

## 2. Tester Feedback Form Questions

To gather structured feedback, the coordinator will ask testers the following questions:

1. **Basic Info**: Which browser (Chrome, Safari, Firefox, Edge) and device (Desktop, Tablet, Mobile) did you use?
2. **First Impression**: Did the application shell and landing page load without delays or blank screens?
3. **Authentication**: Did you encounter any issues during signup or login?
4. **Usability**: Was the tree editing process intuitive? Did you face any confusion linking family relationships?
5. **Privacy Masking**: Did you invite another user as a viewer/guest? If yes, did the privacy masking successfully hide names/birthdates of living members as expected?
6. **Integrations**: Did Kindi (AI Assistant) and the migration maps load and respond correctly?
7. **Manuscript & Export**: Did you try compiling a Family Manuscript or exporting a GEDCOM? Did the output feel useful and format correctly?
8. **Billing Sandbox**: Did the paywall dialog open correctly and show sandbox billing overlays?
9. **Critical Issues**: Did you experience any crashes, freezing, or data losses? (Please describe exact steps).

---

## 3. Bug Severity & Action Guide

* **P0 (Blocker)**:
  * *Examples*: Security/privacy leak (unmasked living data shown to viewers), database write failure, data loss during GEDCOM export/import, or total login failure.
  * *Action*: Immediate invite freeze. Revert staging environment using `beta-v2.0-rollback` tag, revoke Vercel bypass access, and resolve before resuming.
* **P1 (High)**:
  * *Examples*: Kindi AI assistant fails to parse, migration map markers do not load, or Paddle sandbox fails to load checkouts.
  * *Action*: Track and fix in the next staging patch. Tester cohort remains active but advised to avoid the failing component.
* **P2 (Medium/Low)**:
  * *Examples*: Layout misalignments, slow font rendering, or minor grammatical typos.
  * *Action*: Logged in the project issue backlog to be addressed before the public beta release.

---

## 4. Owner Launch Checklist (Before Sending First Invite)

Before pressing "Send" on the first invitation:

- [ ] **Code Verification**: Confirm latest staging build has passed typecheck (`npm run typecheck`) and the E2E smoke suite (`live-deployed-smoke.spec.ts`).
- [ ] **Git Alignment**: Confirm local `HEAD` matches remote `origin/main` and tag `beta-v2.0-rollback` is successfully pushed to origin.
- [ ] **Staging Access**: Confirm the preview deployment URL and Vercel Automation Bypass cookies are verified and functional.
- [ ] **Supabase Auth Rules**: Confirm signup is restricted to invited email addresses under the Supabase Auth settings panel.
- [ ] **Paddle Environment**: Verify Paddle client and webhook environments are configured to `sandbox` rather than `production`.
