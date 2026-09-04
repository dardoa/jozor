import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { KindiOverlay } from '../components/KindiOverlay';
import type { KindiConfirmation, KindiMessage } from '../types';
import type { Person } from '../../../types';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      kindi: {
        title: 'كِندي',
        dialogLabel: 'مساعد كِندي الذكي',
        subtitle: 'مساعد البحث والتحكم بالشجرة',
        close: 'إغلاق كِندي',
        unnamedPerson: 'شخص بلا اسم',
        personProfile: 'ملف الشخص',
        choose: 'اختيار',
        showMore: 'عرض المزيد',
        remaining: 'متبقٍ',
        cancel: 'إلغاء',
        selectionCancelled: 'تم إلغاء هذا الاختيار، ولم تتغير أي بيانات.',
        thinking: 'كِندي يفكر',
        pendingDecision: 'يوجد قرار بانتظار التأكيد...',
        confirmShortcut: 'للتأكيد',
        cancelShortcut: 'للتراجع',
        listeningPlaceholder: 'جارٍ الاستماع...',
        messagePlaceholder: 'اسأل كِندي...',
        messageLabel: 'رسالة إلى كِندي',
        stopVoice: 'إيقاف الإدخال الصوتي',
        startVoice: 'بدء الإدخال الصوتي',
        send: 'إرسال إلى كِندي',
        newConversation: 'بدء محادثة جديدة',
        newConversationUnavailable: 'أنهِ القرار المعلّق قبل بدء محادثة جديدة',
        currentContext: 'السياق الحالي',
        startHere: 'ابدأ بأحد هذه الخيارات',
        starterFamily: 'اسأل عن العائلة',
        starterFamilyPrompt: 'من هم أبناؤه؟',
        starterChange: 'حضّر تغييرًا آمنًا',
        starterChangePrompt: 'أضف ابن لهذا الشخص',
        starterHelp: 'تعرّف على استخدام جذور',
        starterHelpPrompt: 'كيف أضيف شخصًا إلى الشجرة؟',
        undoChange: 'التراجع عن هذا التغيير',
        undoDone: 'تم التراجع عن التغيير',
        undoExpired: 'لم يعد التراجع متاحًا',
        undoFailed: 'تعذر التراجع',
        answerKinds: {
          relationship: 'إجابة عائلية',
          diagnostic: 'فحص بيانات الشجرة',
          biography: 'مسودة سيرة محلية',
          'record-review': 'مراجعة السجل والمصادر',
          search: 'نتائج البحث',
          guide: 'دليل جذور',
          change: 'تغيير مُحضّر',
        },
        answerSources: {
          localTree: 'من شجرتك',
          helpCenter: 'من مركز المساعدة',
          cloudAssisted: 'بمساعدة سحابية',
        },
        answerFeedbackPrompt: 'هل كانت هذه الإجابة مفيدة؟',
        answerHelpful: 'مفيدة',
        answerNotHelpful: 'غير مفيدة',
        answerFeedbackThanks: 'شكرًا لملاحظتك',
        diagnosticHealth: 'الصحة',
        diagnosticCompleteness: 'الاكتمال',
        diagnosticSources: 'المصادر',
        diagnosticNotApplicable: 'غير منطبق',
        diagnosticIssueCounts: (errors: number, warnings: number, notes: number) => `${errors} أخطاء · ${warnings} تنبيهات · ${notes} ملاحظات تحسين`,
        diagnosticOpenRecord: 'فتح السجل',
        diagnosticNextSteps: 'خطوات الإثراء المقترحة',
        biographyDraftHeading: 'مسودة السيرة',
        biographyFactsUsed: 'الحقائق المستخدمة',
        biographyNotSaved: 'هذه مسودة للمعاينة فقط ولم تُحفظ في سجل الشخص.',
        recordReviewHeading: 'مراجعة السجل',
        recordReviewSourceSummary: (recorded: number, displayed: number) => `المصادر المسجلة: ${recorded} · الملخصة بأمان: ${displayed}`,
        recordReviewNextSteps: 'ملاحظات المراجعة',
        recordReviewNotSaved: 'لم تغيّر هذه المراجعة سجل الشخص ولم تحفظ فيه شيئًا.',
        recordReviewOpenRecord: 'فتح سجل الشخص',
        detailsHeading: 'التفاصيل التي سيتم حفظها',
        confirmedStatus: 'تم تنفيذ القرار.',
        processingStatus: 'جارٍ تنفيذ القرار...',
        failedStatus: 'تعذر تنفيذ القرار.',
        cancelledStatus: 'تم إلغاء القرار.',
        emptyValue: 'فارغ',
        fields: {
          name: 'الاسم',
          firstName: 'الاسم الأول',
          middleName: 'الاسم الأوسط',
          nickName: 'الكنية',
          lastName: 'اسم العائلة',
          birthDate: 'تاريخ الميلاد',
          birthPlace: 'مكان الميلاد',
          profession: 'المهنة',
          residence: 'السكن',
          deathDate: 'تاريخ الوفاة',
          deathPlace: 'مكان الوفاة',
          bio: 'ملاحظات',
        },
      },
    },
  }),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const baseConfirmation: KindiConfirmation = {
  id: 'confirm-1',
  title: 'Confirm update',
  description: 'Update a person',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  kind: 'UPDATE',
  status: 'pending',
  relatedPeople: [],
  plan: {
    type: 'UPDATE',
    personId: 'p1',
    updates: {
      profession: 'Engineer',
    },
  },
};

const renderOverlay = (confirmation: KindiConfirmation) => {
  const props = {
    isOpen: true,
    draft: '',
    messages: [
      {
        id: 'message-1',
        role: 'assistant',
        text: 'Review this decision',
        confirmation,
      },
    ] satisfies KindiMessage[],
    isThinking: false,
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    onFocusPerson: vi.fn(),
    onOpenPersonRecord: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onCancelDisambiguation: vi.fn(),
    onShowMorePeople: vi.fn(),
    onChooseDisambiguation: vi.fn(),
    onStartNewConversation: vi.fn(),
    onUndoChange: vi.fn(),
    onRateAnswer: vi.fn(),
    hasPendingDecision: true,
  };

  render(<KindiOverlay {...props} />);
  return props;
};

const testPerson = (id: string, firstName: string): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'Alqarji',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'female',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
});

const testPersonWithRelations = (
  id: string,
  firstName: string,
  overrides: Partial<Person>
): Person => ({
  ...testPerson(id, firstName),
  ...overrides,
});

const renderOverlayWithMessages = (
  messages: KindiMessage[],
  hasPendingDecision = true,
  peopleById: Record<string, Person> = {},
  contextPerson?: Person
) => {
  const props = {
    isOpen: true,
    draft: '',
    messages,
    peopleById,
    contextPerson,
    isThinking: false,
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    onFocusPerson: vi.fn(),
    onOpenPersonRecord: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onCancelDisambiguation: vi.fn(),
    onShowMorePeople: vi.fn(),
    onChooseDisambiguation: vi.fn(),
    onStartNewConversation: vi.fn(),
    onUndoChange: vi.fn(),
    onRateAnswer: vi.fn(),
    hasPendingDecision,
  };

  render(<KindiOverlay {...props} />);
  return props;
};

describe('KindiOverlay keyboard confirmation guardrails', () => {
  it('uses localized shell labels and accessible command names', () => {
    renderOverlayWithMessages([
      { id: 'message-plain', role: 'assistant', text: 'جاهز' },
    ], false);

    expect(screen.getByRole('dialog', { name: 'مساعد كِندي الذكي' })).toBeInTheDocument();
    expect(screen.getByText('مساعد البحث والتحكم بالشجرة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إغلاق كِندي' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'رسالة إلى كِندي' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إرسال إلى كِندي' })).toBeInTheDocument();
  });

  it('uses starter actions to prepare a draft without submitting it', () => {
    const contextPerson = testPerson('p1', 'ليلى');
    const props = renderOverlayWithMessages([
      { id: 'kindi:welcome', role: 'assistant', text: 'مرحبًا' },
    ], false, { [contextPerson.id]: contextPerson }, contextPerson);
    fireEvent.click(screen.getByRole('button', { name: 'اسأل عن العائلة' }));

    expect(props.onDraftChange).toHaveBeenCalledWith('من هم أبناؤه؟');
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('offers undo only for an available Kindi mutation', () => {
    const props = renderOverlayWithMessages([{
      id: 'message-with-undo',
      role: 'assistant',
      text: 'تم التعديل',
      undoAction: {
        status: 'available',
        peopleVersion: 4,
        historyEntryToken: 'kindi-history-test',
        pastCount: 1,
        futureCount: 0,
      },
    }], false);

    fireEvent.click(screen.getByRole('button', { name: 'التراجع عن هذا التغيير' }));

    expect(props.onUndoChange).toHaveBeenCalledWith('message-with-undo', {
      status: 'available',
      peopleVersion: 4,
      historyEntryToken: 'kindi-history-test',
      pastCount: 1,
      futureCount: 0,
    });
  });

  it('shows a structured answer source and accepts feedback once', () => {
    const props = renderOverlayWithMessages([{
      id: 'answer-1',
      role: 'assistant',
      text: 'وجدت ثلاثة أبناء.',
      answerMeta: {
        source: 'local-tree',
        kind: 'relationship',
        feedbackEnabled: true,
      },
    }], false);

    expect(screen.getByText('إجابة عائلية')).toBeInTheDocument();
    expect(screen.getByText('من شجرتك')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'مفيدة' }));
    expect(props.onRateAnswer).toHaveBeenCalledWith('answer-1', 'helpful');
  });

  it('renders a compact structured summary for a diagnostic answer', () => {
    const affectedPerson = testPerson('diagnostic-person', 'ليلى');
    const props = renderOverlayWithMessages([{
      id: 'diagnostic-1',
      role: 'assistant',
      text: 'اكتمل فحص الشجرة.',
      answerMeta: {
        source: 'local-tree',
        kind: 'diagnostic',
      },
      diagnosticSummary: {
        scope: 'tree',
        healthScore: 82,
        completenessScore: 64,
        citationCoverage: 35,
        errorCount: 1,
        warningCount: 2,
        reviewNoteCount: 7,
      },
      people: [affectedPerson],
      diagnosticPersonContexts: [{
        personId: affectedPerson.id,
        summary: '3 ملاحظات · اكتمال البيانات',
      }],
    }], false);

    expect(screen.getByTestId('kindi-diagnostic-summary')).toHaveTextContent('82%');
    expect(screen.getByTestId('kindi-diagnostic-summary')).toHaveTextContent('64%');
    expect(screen.getByTestId('kindi-diagnostic-summary')).toHaveTextContent('35%');
    expect(screen.getByText('1 أخطاء · 2 تنبيهات · 7 ملاحظات تحسين')).toBeInTheDocument();
    expect(screen.getByText('3 ملاحظات · اكتمال البيانات')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ليلى.*فتح السجل/ }));
    expect(props.onOpenPersonRecord).toHaveBeenCalledWith(
      affectedPerson.id,
      'about',
      'overview'
    );
    expect(props.onFocusPerson).not.toHaveBeenCalled();
  });

  it('does not present absent source claims as perfect citation coverage', () => {
    renderOverlayWithMessages([{
      id: 'diagnostic-no-claims',
      role: 'assistant',
      text: 'اكتمل الفحص.',
      diagnosticSummary: {
        scope: 'tree',
        healthScore: 100,
        completenessScore: 0,
        citationCoverage: null,
        errorCount: 0,
        warningCount: 0,
        reviewNoteCount: 5,
      },
    }], false);

    expect(screen.getByTestId('kindi-diagnostic-summary')).toHaveTextContent('غير منطبق');
    expect(screen.getByTestId('kindi-diagnostic-summary')).not.toHaveTextContent('المصادر100%');
  });

  it('renders deterministic enrichment suggestions without applying a change', () => {
    const props = renderOverlayWithMessages([{
      id: 'diagnostic-suggestions',
      role: 'assistant',
      text: 'راجعت السجل.',
      diagnosticSuggestions: [
        {
          key: 'birth-date',
          text: 'أضف تاريخ الميلاد إذا كان معروفًا وموثقًا.',
          targetPersonId: 'record-person-id',
          targetTab: 'about',
          targetSection: 'overview',
          targetField: 'birthDate',
        },
        {
          key: 'parents',
          text: 'أضف الوالدين المعروفين أو اترك الحقل دون تخمين.',
          targetPersonId: 'record-person-id',
          targetTab: 'links',
          targetSection: 'relationships',
          targetField: 'parents',
        },
      ],
    }], false);

    const suggestions = screen.getByTestId('kindi-diagnostic-suggestions');
    expect(suggestions).toHaveAccessibleName('خطوات الإثراء المقترحة');
    expect(suggestions).toHaveTextContent('أضف تاريخ الميلاد إذا كان معروفًا وموثقًا.');
    expect(suggestions.innerHTML).not.toContain('record-person-id');
    fireEvent.click(screen.getByRole('button', {
      name: /أضف الوالدين المعروفين.*فتح السجل/,
    }));
    expect(props.onOpenPersonRecord).toHaveBeenCalledWith(
      'record-person-id',
      'links',
      'relationships',
      'parents'
    );
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('separates a biography preview from its recorded facts and saved state', () => {
    const props = renderOverlayWithMessages([{
      id: 'biography-draft',
      role: 'assistant',
      text: 'أعددت مسودة محلية من الحقائق المسجلة فقط.',
      answerMeta: {
        source: 'local-tree',
        kind: 'biography',
      },
      biographyDraft: {
        facts: [
          { label: 'الاسم المسجل', value: 'رمضان القرجي' },
          { label: 'سنة الميلاد', value: '1895' },
        ],
        text: 'رمضان القرجي. وُلد عام 1895.',
        isSaved: false,
      },
    }], false);

    const draft = screen.getByTestId('kindi-biography-draft');
    expect(screen.getByText('مسودة سيرة محلية')).toBeInTheDocument();
    expect(draft).toHaveAccessibleName('مسودة السيرة');
    expect(draft).toHaveTextContent('رمضان القرجي. وُلد عام 1895.');
    expect(draft).toHaveTextContent('الحقائق المستخدمة');
    expect(draft).toHaveTextContent('لم تُحفظ في سجل الشخص');
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('renders a concise local record review without a confirmation action', () => {
    const props = renderOverlayWithMessages([{
      id: 'record-review',
      role: 'assistant',
      text: 'نظّمت سجل الشخص محليًا للمراجعة فقط.',
      answerMeta: {
        source: 'local-tree',
        kind: 'record-review',
      },
      recordReview: {
        sections: [
          { id: 'facts', title: 'الحقائق المسجلة', items: [{ label: 'الاسم المسجل', value: 'رمضان القرجي' }] },
          { id: 'notes', title: 'الملاحظات', items: [{ label: 'ملاحظة مسجلة 1', value: 'معلومة عائلية موثقة' }] },
          { id: 'sources', title: 'المصادر', items: [{ label: 'سجل العائلة', value: 'دفتر عائلي · 1950' }] },
        ],
        sourceSummary: {
          recordedCount: 1,
          displayedCount: 1,
          hasBirthSource: false,
          hasDeathSource: false,
        },
        reviewNotes: ['تحقق من المعلومات مقابل أصل المصدر.'],
        isSaved: false,
      },
      recordReviewTargetPersonId: 'record-person-id',
    }], false);

    const review = screen.getByTestId('kindi-record-review');
    expect(screen.getByText('مراجعة السجل والمصادر')).toBeInTheDocument();
    expect(review).toHaveAccessibleName('مراجعة السجل');
    expect(review).toHaveTextContent('رمضان القرجي');
    expect(review).toHaveTextContent('معلومة عائلية موثقة');
    expect(review).toHaveTextContent('سجل العائلة');
    expect(review).toHaveTextContent('المصادر المسجلة: 1 · الملخصة بأمان: 1');
    expect(review).toHaveTextContent('لم تغيّر هذه المراجعة سجل الشخص');
    fireEvent.click(screen.getByRole('button', { name: 'فتح سجل الشخص' }));
    expect(props.onOpenPersonRecord).toHaveBeenCalledWith(
      'record-person-id',
      'about',
      'workBio'
    );
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('does not confirm a pending decision with plain Enter', () => {
    const props = renderOverlay(baseConfirmation);

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('confirms non-delete decisions with Ctrl+Enter', () => {
    const props = renderOverlay(baseConfirmation);

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

    expect(props.onConfirm).toHaveBeenCalledWith(baseConfirmation);
  });

  it('does not confirm delete decisions with Ctrl+Enter', () => {
    const deleteConfirmation: KindiConfirmation = {
      ...baseConfirmation,
      kind: 'DELETE',
      title: 'Confirm delete',
      description: 'Delete a person',
      confirmLabel: 'Delete',
      plan: {
        type: 'DELETE',
        personId: 'p1',
      },
    };
    const props = renderOverlay(deleteConfirmation);

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('cancels the active decision with Escape', () => {
    const props = renderOverlay(baseConfirmation);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(props.onCancel).toHaveBeenCalledWith(baseConfirmation);
  });

  it('closes Kindi with Escape when no decision is active', () => {
    const props = renderOverlayWithMessages([
      { id: 'message-plain', role: 'assistant', text: 'جاهز' },
    ], false);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('cancels the active disambiguation with Escape instead of closing Kindi', () => {
    const props = renderOverlayWithMessages([
      {
        id: 'message-disambiguation',
        role: 'assistant',
        text: 'Which Lina?',
        people: [
          testPerson('p1', 'Lina'),
          testPerson('p2', 'Lina'),
        ],
        disambiguation: {
          promptName: 'Lina',
          routedIntent: {
            kind: 'ACTION',
            query: 'add child for Lina',
            parsedIntents: [],
            targetText: 'Lina',
            summary: 'Add child',
          },
          resultPeople: [],
          status: 'pending',
        },
      },
    ]);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(props.onCancelDisambiguation).toHaveBeenCalledWith('message-disambiguation');
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('shows relationship context on disambiguation person cards', () => {
    const father = testPersonWithRelations('father', 'Mahmoud', { gender: 'male' });
    const child = testPersonWithRelations('child', 'Lina', { parents: [father.id] });

    renderOverlayWithMessages([
      {
        id: 'message-disambiguation',
        role: 'assistant',
        text: 'Which Lina?',
        people: [child],
        disambiguation: {
          promptName: 'Lina',
          routedIntent: {
            kind: 'ACTION',
            query: 'add child for Lina',
            parsedIntents: [],
            targetText: 'Lina',
            summary: 'Add child',
          },
          resultPeople: [],
          status: 'pending',
        },
      },
    ], true, { [father.id]: father, [child.id]: child });

    expect(document.body.textContent).toContain('بنت Mahmoud Alqarji');
  });

  it('does not close from the backdrop while a decision is pending', () => {
    const props = renderOverlay(baseConfirmation);
    const backdrop = document.querySelector('[data-testid="kindi-backdrop"]') as HTMLElement;

    fireEvent.click(backdrop);

    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('closes from the backdrop when no decision is pending', () => {
    const props = renderOverlayWithMessages([
      {
        id: 'message-plain',
        role: 'assistant',
        text: 'Ready',
      },
    ], false);
    const backdrop = document.querySelector('[data-testid="kindi-backdrop"]') as HTMLElement;

    fireEvent.click(backdrop);

    expect(props.onClose).toHaveBeenCalledOnce();
  });
});
