import type { Language } from '../../../types/common';
import type { KindiExecutivePlan, KindiRoutedIntent } from '../types';

const KINDI_AR_STRINGS = {
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
  },

  outOfScope: [
    'أستطيع مساعدتك في شجرة العائلة واستخدام جذور، لكن هذا السؤال خارج نطاقي. جرب أن تسألني عن قريب أو علاقة أو ميزة في التطبيق.',
    'عملي يتركز على الأنساب وشجرة عائلتك في جذور. يمكنني العثور على شخص، أو شرح علاقة، أو تجهيز تغيير آمن للمراجعة.',
    'لا أملك إجابة موثوقة لهذا الموضوع. اسألني عن الشجرة أو عن طريقة استخدام إحدى أدوات جذور.',
  ],

  flow: {
    pendingDecision:
      'أنهِ البطاقة المعلقة أولاً: اختر شخصاً، أكد العملية، أو اضغط إلغاء. لم أبدأ طلباً جديداً.',
    searchPrompt:
      'أخبرني باسم الشخص أو صلة القرابة التي تريد البحث عنها. مثال: محمد القرجي، أبناء محمود، أو أشخاص من مكة.',
    addPrompt:
      'حدّد الشخص والصلة. مثال: أضف ابنًا لمحمد، أو أضف زوجة لسامي اسمها نورة.',
    missingNewPersonName:
      'أحتاج اسم الشخص الجديد قبل المتابعة. اكتب الاسم فقط، مثل: علي القرجي.',
    cancelled:
      'تم إلغاء الطلب. لم يتم تغيير أي بيانات.',
    disambiguationCancelled:
      'تم إلغاء الاختيار. لم أنفذ أي أمر على الشجرة.',
  },

  support: {
    withContext: (personName: string) =>
      `أستطيع البحث عن الأشخاص والعلاقات، أو تجهيز إضافة وتعديل وحذف بعد بطاقة تأكيد. آخر شخص في السياق هو ${personName}.`,
    generic:
      'أستطيع الإجابة عن الأشخاص والعلاقات، وشرح أدوات جذور، وتجهيز الإضافة أو التعديل أو الحذف للمراجعة والتأكيد.',
    familyQuery:
      'حدّد شخصًا في الشجرة أو اذكر اسمه، ثم اسأل عن والديه أو أبنائه أو أزواجه أو إخوته.',
    unclear:
      'لم يتضح طلبك بعد. اذكر اسم شخص أو علاقة عائلية، أو اسألني عن طريقة استخدام أداة في جذور.',
  },

  permissions: {
    readOnly:
      'هذه الشجرة للقراءة فقط، لذلك لا يمكنني إجراء تعديلات. ما زلت أستطيع مساعدتك في البحث والإجابة عن العلاقات.',
  },

  execution: {
    readOnlyError:
      'هذه الشجرة للقراءة فقط، لا يمكنني إجراء تعديلات.',
    readOnlyReply: (error: string) => `عذراً، ${error}`,
    invalidPlanError:
      'لم أجد خطة تنفيذ صالحة لهذا الطلب.',
    invalidPlanReply: (error: string) => `${error} لم يتم تغيير أي بيانات.`,
    missingAddNameError:
      'لا أستطيع تنفيذ الإضافة قبل معرفة اسم الشخص الجديد.',
    missingAddNameReply: (error: string) =>
      `${error} أعد الطلب مع الاسم، مثل: أضف ابنًا اسمه علي لسامي.`,
    unsupportedActionError:
      'إجراء كيندي غير مدعوم.',
    addFailed:
      'تعذر تنفيذ الإضافة. لم يتم تغيير بيانات الشجرة.',
    updateFailed:
      'تعذر تنفيذ التعديل. لم يتم تغيير بيانات الشجرة.',
    deleteFailed:
      'تعذر تنفيذ الحذف. لم يتم تغيير بيانات الشجرة.',
    unexpectedFailure:
      'تعذر التحقق من اكتمال العملية. راجع الشجرة قبل المحاولة مجددًا.',
    addSuccess: (personName: string) =>
      `تمت إضافة ${personName} إلى الشجرة بنجاح.`,
    updateSuccess: (personName: string) =>
      `تم تحديث بيانات ${personName} بنجاح.`,
    deleteSuccess: (personName: string) =>
      `تم حذف ${personName} من الشجرة بنجاح.`,
    undoSuccess: 'تم التراجع عن آخر تغيير نفذه كيندي.',
    undoExpired: 'تعذر التراجع لأن الشجرة تغيرت بعد تنفيذ هذا الإجراء.',
    undoFailed: 'تعذر التراجع عن هذا التغيير. لم أنفذ أي إجراء إضافي.',
    fallbackPersonName: 'الشخص',
    fallbackNewPersonName: 'الشخص الجديد',
  },

  addName: {
    prompt: (relationLabel: string, targetName?: string) =>
      `ما اسم ${relationLabel} المراد إضافته لـ${targetName || 'الشخص المحدد'}؟ اكتب الاسم فقط أو الاسم الكامل.`,
    prepared: (newName: string, relationLabel: string, targetName?: string) =>
      `أعددت بطاقة تأكيد لإضافة ${newName} كـ${relationLabel} لـ${targetName || 'الشخص المحدد'}.`,
  },

  disambiguation: {
    prompt: (promptName?: string) =>
      `أي ${promptName || 'شخص'} تقصد؟ اختر البطاقة الصحيحة لأكمل بطاقة التأكيد.`,
    defaultPromptName: 'شخص',
    selected: (personName: string, nextText: string) =>
      `اخترت ${personName}. ${nextText}`,
    noPlan:
      'لم أستطع بناء خطة واضحة بعد اختيار الشخص. لم يتم تغيير أي بيانات.',
  },

  search: {
    reliable: (count: number, visibleCount: number) =>
      `وجدت ${count} نتيجة موثوقة. أعرض أفضل ${visibleCount} نتيجة؛ اختر بطاقة للانتقال إليها في الشجرة.`,
    nearby:
      'وجدت نتائج قريبة، لكنني لست متأكدًا بما يكفي. هل تقصد أحد هؤلاء؟',
    notFound:
      'لم أجد نتيجة واضحة. جرب اسمًا أدق أو علاقة مثل: أبناء محمود، أو أشخاص من مكة.',
    lowConfidence:
      'لم أجد تطابقًا كافيًا. اكتب الاسم الأول واسم العائلة كما يظهران في البطاقة.',
  },

  planning: {
    actionLabel: (kind: KindiRoutedIntent['kind']) => kind === 'DELETE' ? 'الحذف' : 'التعديل',
    targetNotFound: (target?: string) =>
      `لم أجد "${target || 'الشخص المطلوب'}" في الشجرة. اكتب الاسم كما يظهر في البطاقة، أو اختر الشخص من البحث أولاً.`,
    subjectNotFound: (target: string | undefined, actionLabel: string) =>
      `لم أجد "${target || 'الشخص المطلوب'}" في الشجرة. اكتب الاسم كما يظهر في البطاقة قبل تنفيذ ${actionLabel}.`,
    noPlan: (routed: KindiRoutedIntent) => {
      if (routed.kind === 'ACTION') {
        return 'أحتاج صياغة أوضح قبل تجهيز الإجراء. مثال: أضف بنتًا اسمها جورية لرمضان القرجي.';
      }

      if (routed.kind === 'DELETE') {
        return 'فهمت أنك تريد حذف شخص، لكنني لم أستطع تحديده بدقة.';
      }

      return 'لم أستطع تحديد الشخص أو الحقل بدقة. مثال: عدّل تاريخ ميلاد محمود إلى 1980-01-01.';
    },
    confirmationPrepared: (summary: string) =>
      `${summary}. أعددت بطاقة مراجعة آمنة قبل التنفيذ.`,
    finalConfirmationPrepared:
      'أعددت بطاقة المراجعة النهائية.',
  },

  confirmation: {
    title: (kind: KindiRoutedIntent['kind']) =>
      kind === 'ACTION'
        ? 'مراجعة إضافة إلى الشجرة'
        : kind === 'DELETE'
          ? 'مراجعة حذف شخص'
          : 'مراجعة تعديل البيانات',
    addDescription: (
      newPersonName: string | undefined,
      relationLabel: string,
      targetPersonName?: string
    ) =>
      `ستتم إضافة ${newPersonName || 'الشخص الجديد'} كـ${relationLabel} لـ${targetPersonName || 'الشخص المحدد حاليًا'}.`,
    deleteDescription:
      'سيُحذف الشخص المختار من الشجرة عبر مسار الحذف الرسمي بعد تأكيدك.',
    updateDescription:
      'ستُحدّث بيانات الشخص المختار عبر مسار أوامر الشجرة الرسمي بعد تأكيدك.',
    confirmLabel: (kind: KindiRoutedIntent['kind']) => kind === 'DELETE' ? 'حذف' : 'تأكيد',
    cancelLabel: 'إلغاء',
  },

  relationLabel: (plan: Extract<KindiExecutivePlan, { type: 'ADD' }>) => {
    if (plan.relation === 'parent') return plan.gender === 'female' ? 'أم' : 'أب';
    if (plan.relation === 'spouse') return plan.gender === 'female' ? 'زوجة' : 'زوج';
    return plan.gender === 'female' ? 'بنت' : 'ابن';
  },

  routeSummary: (kind: KindiRoutedIntent['kind'], hasParsedIntent: boolean) => {
    if (kind === 'ACTION') return 'طلب إضافة إلى الشجرة';
    if (kind === 'UPDATE') return 'طلب تعديل بيانات';
    if (kind === 'DELETE') return 'طلب حذف شخص';
    if (kind === 'GREETING') return 'تحية';
    if (kind === 'SUPPORT') return 'طلب مساعدة';
    return hasParsedIntent ? 'استعلام عن الشجرة' : 'بحث نصي';
  },

  billing: {
    freePaywall:
      'يفهم مساعد كيندي المحلي الأوامر الصريحة. لمعالجة الصياغات المعقدة، أعد كتابة الطلب بوضوح أو فعّل الفهم السحابي ضمن الباقة المناسبة.',
    quotaExhausted:
      'استهلكت الاستعلامات السحابية المتاحة لهذه الفترة. يمكنك متابعة استخدام قدرات كيندي المحلية أو ترقية الباقة.',
  },

  cloud: {
    unavailable:
      'تعذر الوصول إلى الفهم السحابي الآن. لم أنفذ أي تغيير على الشجرة؛ يمكنك المحاولة لاحقًا أو استخدام سؤال محلي أو أمر أكثر وضوحًا.',
  },
} as const;

const KINDI_EN_STRINGS = {
  initialMessage:
    'I am Kindi. Ask me about people, relationships, or places, or request an action and I will ask for confirmation before changing anything.',

  greetings: {
    welcome: [
      'Welcome. I am Kindi, your family-tree assistant. What would you like to find or update?',
      'Hello. I can help you explore relatives, understand relationships, or prepare a safe change for review.',
      'Good to see you. Would you like to search the tree, ask about a relationship, or add a family member?',
      'Hello. I can search for a person, explain a relationship, or prepare an action that you approve before it runs.',
    ],
    wellbeing: [
      'I am doing well and ready to help with your family tree. What shall we work on?',
      'I am well, thank you. Would you like to find someone or work on the tree?',
      'Doing well. Tell me which person or family relationship you want to explore.',
    ],
  },

  outOfScope: [
    'I can help with your family tree and the Jozor app, but that question is outside my scope. Try asking about a relative, a relationship, or an app feature.',
    'My role is focused on genealogy and your family tree in Jozor. I can find a person, explain a relationship, or prepare a safe change for review.',
    'I do not have a reliable answer for that topic. Ask me about the tree or how to use a Jozor feature.',
  ],

  flow: {
    pendingDecision:
      'Finish the pending card first: choose a person, confirm the action, or cancel it. I did not start a new request.',
    searchPrompt:
      'Tell me the person or relationship you want to find. For example: Mohammed Al-Qurji, Mahmoud’s children, or people from Mecca.',
    addPrompt:
      'Specify the person and relationship. For example: add a son to Mohammed, or add a wife named Nora to Sami.',
    missingNewPersonName:
      'I need the new person’s name before continuing. Enter a name such as Ali Al-Qurji.',
    cancelled:
      'The request was cancelled. No data was changed.',
    disambiguationCancelled:
      'The selection was cancelled. I did not run any tree action.',
  },

  support: {
    withContext: (personName: string) =>
      `I can search people and relationships, or prepare an add, update, or delete action for confirmation. The latest person in context is ${personName}.`,
    generic:
      'I can answer questions about people and relationships, explain Jozor features, and prepare add, update, or delete actions for your review.',
    familyQuery:
      'Select a person in the tree or mention their name, then ask about their parents, children, spouses, or siblings.',
    unclear:
      'I am not sure what you mean yet. Mention a person or family relationship, or ask how to use a feature in Jozor.',
  },

  permissions: {
    readOnly:
      'This tree is read-only, so I cannot make changes. I can still help you search and answer relationship questions.',
  },

  execution: {
    readOnlyError:
      'This tree is read-only, so I cannot make changes.',
    readOnlyReply: (error: string) => error,
    invalidPlanError:
      'I could not find a valid execution plan for this request.',
    invalidPlanReply: (error: string) => `${error} No data was changed.`,
    missingAddNameError:
      'I cannot add the person until I know their name.',
    missingAddNameReply: (error: string) =>
      `${error} Try again with a name, for example: add a son named Ali to Sami.`,
    unsupportedActionError:
      'This Kindi action is not supported.',
    addFailed:
      'The person could not be added. No tree data was changed.',
    updateFailed:
      'The update could not be completed. No tree data was changed.',
    deleteFailed:
      'The person could not be deleted. No tree data was changed.',
    unexpectedFailure:
      'I could not verify whether the operation completed. Review the tree before trying again.',
    addSuccess: (personName: string) =>
      `${personName} was added to the tree successfully.`,
    updateSuccess: (personName: string) =>
      `${personName} was updated successfully.`,
    deleteSuccess: (personName: string) =>
      `${personName} was deleted from the tree successfully.`,
    undoSuccess: 'Kindi’s latest change was undone.',
    undoExpired: 'Undo is no longer available because the tree changed after this action.',
    undoFailed: 'This change could not be undone. I did not apply another action.',
    fallbackPersonName: 'the person',
    fallbackNewPersonName: 'the new person',
  },

  addName: {
    prompt: (relationLabel: string, targetName?: string) =>
      `What is the name of the ${relationLabel} you want to add to ${targetName || 'the selected person'}? Enter a first name or full name.`,
    prepared: (newName: string, relationLabel: string, targetName?: string) =>
      `I prepared a confirmation card to add ${newName} as ${targetName ? `${targetName}’s ${relationLabel}` : `the selected person’s ${relationLabel}`}.`,
  },

  disambiguation: {
    prompt: (promptName?: string) =>
      `Which ${promptName || 'person'} do you mean? Choose the correct card so I can continue.`,
    defaultPromptName: 'person',
    selected: (personName: string, nextText: string) =>
      `You selected ${personName}. ${nextText}`,
    noPlan:
      'I could not build a clear plan after the selection. No data was changed.',
  },

  search: {
    reliable: (count: number, visibleCount: number) =>
      `I found ${count} reliable ${count === 1 ? 'result' : 'results'}. Showing the best ${visibleCount}; choose a card to open it in the tree.`,
    nearby:
      'I found some close results, but I am not certain enough. Do you mean one of these people?',
    notFound:
      'I could not find a clear result. Try a more precise name or a relationship such as Mahmoud’s children or people from Mecca.',
    lowConfidence:
      'I could not find a reliable match. Enter the first and family names as they appear on the person card.',
  },

  planning: {
    actionLabel: (kind: KindiRoutedIntent['kind']) => kind === 'DELETE' ? 'deletion' : 'update',
    targetNotFound: (target?: string) =>
      `I could not find “${target || 'the requested person'}” in the tree. Enter the name as shown on the card, or choose the person in search first.`,
    subjectNotFound: (target: string | undefined, actionLabel: string) =>
      `I could not find “${target || 'the requested person'}” in the tree. Enter the name as shown on the card before the ${actionLabel}.`,
    noPlan: (routed: KindiRoutedIntent) => {
      if (routed.kind === 'ACTION') {
        return 'I need a clearer request before preparing the action. For example: add a daughter named Jouri to Ramadan Al-Qurji.';
      }

      if (routed.kind === 'DELETE') {
        return 'I understand that you want to delete someone, but I could not identify the person reliably.';
      }

      return 'I could not identify the person or field reliably. For example: update Mahmoud’s birth date to 1980-01-01.';
    },
    confirmationPrepared: (summary: string) =>
      `${summary}. I prepared a safe review card before execution.`,
    finalConfirmationPrepared:
      'I prepared the final review card.',
  },

  confirmation: {
    title: (kind: KindiRoutedIntent['kind']) =>
      kind === 'ACTION'
        ? 'Review tree addition'
        : kind === 'DELETE'
          ? 'Review person deletion'
          : 'Review data update',
    addDescription: (
      newPersonName: string | undefined,
      relationLabel: string,
      targetPersonName?: string
    ) =>
      `${newPersonName || 'The new person'} will be added as ${targetPersonName ? `${targetPersonName}’s ${relationLabel}` : `the selected person’s ${relationLabel}`}.`,
    deleteDescription:
      'The selected person will be deleted through the official tree action after you confirm.',
    updateDescription:
      'The selected person’s data will be updated through the official tree action after you confirm.',
    confirmLabel: (kind: KindiRoutedIntent['kind']) => kind === 'DELETE' ? 'Delete' : 'Confirm',
    cancelLabel: 'Cancel',
  },

  relationLabel: (plan: Extract<KindiExecutivePlan, { type: 'ADD' }>) => {
    if (plan.relation === 'parent') return plan.gender === 'female' ? 'mother' : 'father';
    if (plan.relation === 'spouse') return plan.gender === 'female' ? 'wife' : 'husband';
    return plan.gender === 'female' ? 'daughter' : 'son';
  },

  routeSummary: (kind: KindiRoutedIntent['kind'], hasParsedIntent: boolean) => {
    if (kind === 'ACTION') return 'Add to the family tree';
    if (kind === 'UPDATE') return 'Update person data';
    if (kind === 'DELETE') return 'Delete a person';
    if (kind === 'GREETING') return 'Greeting';
    if (kind === 'SUPPORT') return 'Help request';
    return hasParsedIntent ? 'Family-tree query' : 'Text search';
  },

  billing: {
    freePaywall:
      'Local Kindi understands clear commands. Rephrase complex wording more directly, or enable cloud understanding with an eligible plan.',
    quotaExhausted:
      'You have used the cloud queries available for this period. You can continue using Kindi’s local features or upgrade your plan.',
  },

  cloud: {
    unavailable:
      'Cloud understanding is unavailable right now. I did not change the tree; try again later or use a clearer local question or command.',
  },
} as const;

export type KindiStrings = typeof KINDI_AR_STRINGS | typeof KINDI_EN_STRINGS;

export const getKindiStrings = (language: Language): KindiStrings =>
  language === 'en' ? KINDI_EN_STRINGS : KINDI_AR_STRINGS;

// Arabic remains the compatibility default for parser-level and existing callers.
export const KINDI_STRINGS = KINDI_AR_STRINGS;
