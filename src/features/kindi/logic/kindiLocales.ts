import type { KindiExecutivePlan, KindiRoutedIntent } from '../types';

export const KINDI_STRINGS = {
  initialMessage:
    'أنا كيندي. اسألني عن الأشخاص، العلاقات، الأماكن، أو اطلب إجراء وسأطلب تأكيدك قبل أي خطوة.',

  greetings: {
    welcome: [
      'يا أهلاً بك! أنا كيندي، حارس شجرة عائلتك. كيف يمكنني مساعدتك في البحث أو الإضافة اليوم؟',
      'مرحباً بك في جذور. أنا هنا لأجعل الوصول لأقاربك أسهل. ماذا تريد أن نفعل الآن؟',
      'أهلاً وسهلاً! يسعدني رؤيتك. هل نبحث عن أحد أفراد العائلة أم نضيف غصناً جديداً للشجرة؟',
      'تحية طيبة. أستطيع البحث عن اسم، شرح علاقة، أو تجهيز إضافة آمنة بعد تأكيدك. من أين نبدأ؟',
    ],
    wellbeing: [
      'بأفضل حال طالما أن شجرة العائلة تنمو وتترابط! شكراً لسؤالك، كيف يمكنني خدمتك؟',
      'أنا بخير وأعمل بكامل طاقتي لمساعدتك. ماذا عنك؟ هل نبدأ العمل على الشجرة؟',
      'بخير، وسعيد بعودتك. هل تريد البحث عن اسم معين أو ربط صلة قرابة الآن؟',
    ],
    wellbeingPattern: /كيف حالك|شلونك|اخبارك|أخبارك|اخباركم|أخباركم|عساك بخير|how are you/i,
  },

  outOfScope: [
    'أعتذر منك، ذاكرتي ممتلئة فقط بأسماء العوائل وتاريخ الأنساب! لست خبيراً في هذا الأمر، لكنني بارع جداً في إيجاد أقاربك أو إضافة غصن جديد لشجرتك. هل نجرب ذلك؟',
    'سؤال مثير للاهتمام! لكن كوني كيندي، مساعدك في جذور، اهتمامي ينصب بالكامل على شجرة عائلتك. اسألني عن أجدادك أو أبنائك وسأبهرك بالنتائج.',
    'قد لا أملك الجواب على هذا السؤال، ولكنني أملك كل المعلومات عن شجرتك هنا. هل تريد مني البحث عن شخص معين أو شرح كيفية إضافة صلة قرابة؟',
  ],

  flow: {
    pendingDecision:
      'أنه البطاقة المعلقة أولاً: اختر شخصاً، أكد العملية، أو اضغط إلغاء. لم أبدأ طلباً جديداً.',
    searchPrompt:
      'ممتاز! أخبرني باسم الشخص الذي تريد العثور عليه، أو صلة قرابته. مثال: محمد القرجي، أبناء محمود، أو نساء من مكة.',
    addPrompt:
      'أنا جاهز. حدّد الشخص الذي تريد الإضافة إليه والصلة. مثال: أضف ابن لـ محمد، أو أضف زوجة لـ سامي اسمها نورة.',
    missingNewPersonName:
      'أحتاج اسم الشخص الجديد قبل المتابعة. اكتب الاسم فقط، مثل: علي القرجي.',
    cancelled:
      'تم إلغاء الطلب. لم يتم تغيير أي بيانات.',
    disambiguationCancelled:
      'تم إلغاء الاختيار. لم أنفذ أي أمر على الشجرة.',
  },

  support: {
    withContext: (personName: string) =>
      `أنا جاهز. أستطيع البحث عن الأشخاص والعلاقات، أو تنفيذ إضافة وتعديل وحذف بعد بطاقة تأكيد. آخر شخص في السياق هو ${personName}؛ يمكنك قول: أضف له ابناً اسمه علي، أو عدل تاريخ ميلاده إلى 1980-01-01.`,
    generic:
      'أنا جاهز. يمكنك أن تسألني عن الأشخاص والعلاقات والأماكن، أو تطلب إجراء مثل: أضف ابن اسمه علي لسامي، عدل تاريخ ميلاد محمود إلى 1980-01-01، أو احذف شخصاً بعد التأكيد.',
  },

  permissions: {
    readOnly:
      'عذراً، هذه الشجرة للقراءة فقط، لا يمكنني إجراء تعديلات لك.',
  },

  execution: {
    readOnlyError:
      'هذه الشجرة للقراءة فقط، لا يمكنني إجراء تعديلات لك.',
    readOnlyReply: (error: string) => `عذراً، ${error}`,
    invalidPlanError:
      'لم أجد خطة تنفيذ صالحة لهذا الطلب.',
    invalidPlanReply: (error: string) => `${error} لم يتم تغيير أي بيانات.`,
    missingAddNameError:
      'لا أستطيع تنفيذ الإضافة قبل معرفة اسم الشخص الجديد.',
    missingAddNameReply: (error: string) =>
      `${error} أعد الطلب مع الاسم، مثل: أضف ابن اسمه علي لسامي.`,
    unsupportedActionError:
      'إجراء كيندي غير مدعوم.',
    addFailed:
      'تعذر تنفيذ الإضافة. لم أستطع حفظ العملية في مسار المزامنة.',
    addNameUpdateFailed:
      'تمت الإضافة، لكن تعذر تحديث الاسم في مسار المزامنة.',
    updateFailed:
      'تعذر تنفيذ التعديل. لم أستطع حفظ العملية في مسار المزامنة.',
    deleteFailed:
      'تعذر تنفيذ الحذف. لم أستطع حفظ العملية في مسار المزامنة.',
    addSuccess: (personName: string) =>
      `تمت إضافة ${personName} إلى الشجرة بنجاح! هل تود الانتقال إليه؟`,
    updateSuccess: (personName: string) =>
      `أبشر، تم تحديث بيانات ${personName} كما طلبت.`,
    deleteSuccess: (personName: string) =>
      `تم حذف ${personName} من الشجرة بنجاح.`,
    fallbackPersonName: 'الشخص',
    fallbackNewPersonName: 'الشخص الجديد',
  },

  addName: {
    prompt: (relationLabel: string, targetName?: string) =>
      `قبل أن أجهز بطاقة التأكيد: ما اسم ${relationLabel} المراد إضافته لـ ${targetName || 'الشخص المحدد'}؟ اكتب الاسم فقط أو الاسم الكامل.`,
    prepared: (newName: string, relationLabel: string, targetName?: string) =>
      `تمام. أعددت بطاقة تأكيد لإضافة ${newName} كـ${relationLabel} لـ ${targetName || 'الشخص المحدد'}.`,
  },

  disambiguation: {
    prompt: (promptName?: string) =>
      `أي ${promptName || 'شخص'} تقصد؟ اختر البطاقة الصحيحة لأكمل بطاقة التأكيد النهائية.`,
    defaultPromptName: 'شخص',
    selected: (personName: string, nextText: string) =>
      `اخترت ${personName}. ${nextText}`,
    noPlan:
      'لم أستطع بناء خطة تنفيذ واضحة بعد اختيار الشخص. لم يتم تغيير أي بيانات.',
  },

  search: {
    reliable: (count: number, visibleCount: number) =>
      `وجدت ${count} نتيجة موثوقة. أعرض لك أفضل ${visibleCount} نتيجة؛ اختر بطاقة للانتقال إليها في الشجرة.`,
    nearby:
      'وجدت نتائج قريبة، لكنني لست متأكداً بما يكفي. هل تقصد أحد هؤلاء؟',
    notFound:
      'لم أجد نتيجة واضحة. جرب اسماً أدق أو علاقة مثل: أبناء محمود، حفيدات رنا، أو من مكة.',
    lowConfidence:
      'لم أجد تطابقاً كافياً. جرب كتابة الاسم بدقة أكبر، أو اكتب الاسم الأول واسم العائلة كما يظهران في البطاقة.',
  },

  planning: {
    actionLabel: (kind: KindiRoutedIntent['kind']) => kind === 'DELETE' ? 'الحذف' : 'التعديل',
    targetNotFound: (target?: string) =>
      `لم أجد "${target}" في الشجرة. اكتب الاسم الأول واسم العائلة كما يظهران في البطاقة، أو اختر الشخص من البحث أولاً.`,
    subjectNotFound: (target: string | undefined, actionLabel: string) =>
      `لم أجد "${target}" في الشجرة. اكتب الاسم كما يظهر في البطاقة قبل تنفيذ ${actionLabel}.`,
    noPlan: (routed: KindiRoutedIntent) => {
      if (routed.kind === 'ACTION') {
        return 'فهمت أنك تريد إجراء تعديل على الشجرة، لكني أحتاج صياغة أوضح قبل التنفيذ. جرب: أضف بنت اسمها جورية لـ رمضان القرجي.';
      }

      if (routed.kind === 'DELETE') {
        return 'فهمت أنك تريد حذف شخص، لكني لم أستطع تحديد الهدف بدقة.';
      }

      return 'فهمت أنك تريد تحديث بيانات، لكني لم أستطع تحديد الشخص أو الحقل بدقة. جرب: عدل تاريخ ميلاد محمود إلى 1980-01-01.';
    },
    confirmationPrepared: (summary: string, query: string) =>
      `${summary}: "${query}". أعددت بطاقة تأكيد آمنة قبل التنفيذ.`,
    finalConfirmationPrepared:
      'أعددت بطاقة التأكيد النهائية.',
  },

  confirmation: {
    title: (kind: KindiRoutedIntent['kind']) =>
      kind === 'ACTION'
        ? 'تأكيد إجراء على الشجرة'
        : kind === 'DELETE'
          ? 'تأكيد حذف شخص'
          : 'تأكيد تعديل بيانات',
    addDescription: (
      newPersonName: string | undefined,
      relationLabel: string,
      targetPersonName?: string
    ) =>
      `سأضيف ${newPersonName || 'الشخص الجديد'} كـ${relationLabel} لـ ${targetPersonName || 'الشخص المحدد حالياً'}.`,
    deleteDescription:
      'سأحذف الشخص المختار من الشجرة. هذا إجراء حساس وسيتم تمريره عبر مسار الحذف والمزامنة.',
    updateDescription:
      'سأحدث بيانات الشخص المختار عبر مسار أوامر الشجرة الرسمي، ثم يبدأ الحفظ والمزامنة كأي تعديل يدوي.',
    confirmLabel: (kind: KindiRoutedIntent['kind']) => kind === 'DELETE' ? 'حذف' : 'تأكيد',
    cancelLabel: 'إلغاء',
  },

  relationLabel: (plan: Extract<KindiExecutivePlan, { type: 'ADD' }>) => {
    if (plan.relation === 'parent') return plan.gender === 'female' ? 'أم' : 'أب';
    if (plan.relation === 'spouse') return plan.gender === 'female' ? 'زوجة' : 'زوج';
    return plan.gender === 'female' ? 'بنت' : 'ابن';
  },
} as const;
