import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTreeActions } from '../../hooks/useTreeActions';
import { searchService } from '../../services/searchService';
import { useAppStore } from '../../store/useAppStore';
import type { MutationActionResult, Person } from '../../types';
import { getFullName } from '../../utils/familyLogic';
import { routeKindiIntent } from './intentRouter';
import {
  createKindiExecutivePlan,
  extractKindiSubjectText,
  extractKindiTargetText,
  parseKindiProvidedName,
  resolveKindiCommandTarget,
} from './kindiExecutivePlanner';
import type { KindiAddPlan, KindiConfirmation, KindiMessage, KindiRoutedIntent } from './types';

interface UseKindiControllerArgs {
  people: Record<string, Person>;
  onFocusPerson: (id: string) => void;
}

interface PendingAddNameRequest {
  routed: KindiRoutedIntent;
  plan: KindiAddPlan;
  relatedPeople: Person[];
}

const createMessageId = () => `kindi:${Date.now()}:${Math.random().toString(36).slice(2)}`;
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const relationLabel = (plan: Extract<NonNullable<KindiConfirmation['plan']>, { type: 'ADD' }>) => {
  if (plan.relation === 'parent') return plan.gender === 'female' ? 'أم' : 'أب';
  if (plan.relation === 'spouse') return plan.gender === 'female' ? 'زوجة' : 'زوج';
  return plan.gender === 'female' ? 'بنت' : 'ابن';
};

const createConfirmation = (
  routed: KindiRoutedIntent,
  plan: NonNullable<KindiConfirmation['plan']>,
  relatedPeople: Person[]
): KindiConfirmation => ({
  id: createMessageId(),
  kind: routed.kind === 'DELETE' ? 'DELETE' : routed.kind === 'UPDATE' ? 'UPDATE' : 'ACTION',
  title: routed.kind === 'ACTION'
    ? 'تأكيد إجراء على الشجرة'
    : routed.kind === 'DELETE'
      ? 'تأكيد حذف شخص'
      : 'تأكيد تعديل بيانات',
  description:
    plan.type === 'ADD'
      ? `سأضيف ${plan.name?.firstName || 'الشخص الجديد'} كـ${relationLabel(plan)} لـ ${plan.targetPersonName || 'الشخص المحدد حالياً'}.`
      : plan.type === 'DELETE'
        ? 'سأحذف الشخص المختار من الشجرة. هذا إجراء حساس وسيتم تمريره عبر مسار الحذف والمزامنة.'
        : 'سأحدث بيانات الشخص المختار عبر مسار أوامر الشجرة الرسمي، ثم يبدأ الحفظ والمزامنة كأي تعديل يدوي.',
  confirmLabel: routed.kind === 'DELETE' ? 'حذف' : 'تأكيد',
  cancelLabel: 'إلغاء',
  status: 'pending',
  relatedPeople,
  plan,
});

export const useKindiController = ({ people, onFocusPerson }: UseKindiControllerArgs) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingAddNameRequest, setPendingAddNameRequest] = useState<PendingAddNameRequest | null>(null);
  const [lastContextPersonId, setLastContextPersonId] = useState<string | undefined>(undefined);
  const treeActions = useTreeActions();
  const setSearchTarget = useAppStore((state) => state.setSearchTarget);
  const triggerPulse = useAppStore((state) => state.triggerPulse);
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const focusId = useAppStore((state) => state.focusId);

  const peopleList = useMemo(() => Object.values(people || {}), [people]);

  const [messages, setMessages] = useState<KindiMessage[]>([
    {
      id: 'kindi:welcome',
      role: 'assistant',
      text: 'أنا كيندي. اسألني عن الأشخاص، العلاقات، الأماكن، أو اطلب إجراء وسأطلب تأكيدك قبل أي خطوة.',
    },
  ]);

  const hasPendingDecision = useMemo(() => messages.some((message) => {
    const hasPendingConfirmation = Boolean(message.confirmation)
      && (!message.confirmation?.status || message.confirmation.status === 'pending' || message.confirmation.status === 'processing');
    const hasPendingDisambiguation = Boolean(message.disambiguation)
      && (!message.disambiguation?.status || message.disambiguation.status === 'pending');
    return hasPendingConfirmation || hasPendingDisambiguation;
  }), [messages]);

  useEffect(() => {
    void searchService.updateSearchIndex(peopleList);
  }, [peopleList]);

  const focusPerson = useCallback((personId: string) => {
    setLastContextPersonId(personId);
    onFocusPerson(personId);
    setSearchTarget(personId);
    triggerPulse(personId);
    setIsOpen(false);
  }, [onFocusPerson, setSearchTarget, triggerPulse]);

  const addAssistantMessage = useCallback((message: Omit<KindiMessage, 'id' | 'role'>) => {
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'assistant',
        ...message,
      },
    ]);
  }, []);

  const requestMissingAddName = useCallback((request: PendingAddNameRequest) => {
    const targetPerson = request.plan.targetPersonId
      ? request.relatedPeople.find((person) => person.id === request.plan.targetPersonId)
      : request.relatedPeople[0];
    const contextPeople = targetPerson ? [targetPerson] : [];

    setPendingAddNameRequest(request);
    addAssistantMessage({
      text: `قبل أن أجهز بطاقة التأكيد: ما اسم ${relationLabel(request.plan)} المراد إضافته لـ ${request.plan.targetPersonName || 'الشخص المحدد'}؟ اكتب الاسم فقط أو الاسم الكامل.`,
      people: contextPeople.length > 0 ? contextPeople : undefined,
      visiblePeopleCount: contextPeople.length,
    });
  }, [addAssistantMessage]);

  const requestDisambiguation = useCallback((
    routed: KindiRoutedIntent,
    candidates: Person[],
    resultPeople: Person[],
    fallbackFocusId: string | undefined,
    promptName?: string
  ) => {
    addAssistantMessage({
      text: `أي ${promptName || 'شخص'} تقصد؟ اختر البطاقة الصحيحة لأكمل بطاقة التأكيد النهائية.`,
      people: candidates,
      visiblePeopleCount: Math.min(candidates.length, 12),
      disambiguation: {
        promptName: promptName || 'شخص',
        routedIntent: routed,
        resultPeople,
        fallbackFocusId,
        status: 'pending',
      },
    });
  }, [addAssistantMessage]);

  const submit = useCallback(async (rawQuery?: string) => {
    const query = (rawQuery ?? draft).trim();
    if (!query) return;
    if (hasPendingDecision) {
      addAssistantMessage({
        text: 'أنه البطاقة المعلقة أولاً: اختر شخصاً، أكد العملية، أو اضغط إلغاء. لم أبدأ طلباً جديداً.',
      });
      return;
    }

    setDraft('');
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'user',
        text: query,
      },
    ]);

    setIsThinking(true);
    try {
      if (pendingAddNameRequest) {
        await sleep(450);

        const name = parseKindiProvidedName(query);
        if (!name?.firstName) {
          const targetPerson = pendingAddNameRequest.plan.targetPersonId
            ? pendingAddNameRequest.relatedPeople.find((person) => person.id === pendingAddNameRequest.plan.targetPersonId)
            : pendingAddNameRequest.relatedPeople[0];
          addAssistantMessage({
            text: 'أحتاج اسم الشخص الجديد قبل المتابعة. اكتب الاسم فقط، مثل: علي القرجي.',
            people: targetPerson ? [targetPerson] : undefined,
            visiblePeopleCount: targetPerson ? 1 : 0,
          });
          return;
        }

        const completedPlan: KindiAddPlan = {
          ...pendingAddNameRequest.plan,
          name,
        };
        setPendingAddNameRequest(null);
        addAssistantMessage({
          text: `تمام. أعددت بطاقة تأكيد لإضافة ${name.firstName}${name.lastName ? ` ${name.lastName}` : ''} كـ${relationLabel(completedPlan)} لـ ${completedPlan.targetPersonName || 'الشخص المحدد'}.`,
          people: pendingAddNameRequest.relatedPeople,
          visiblePeopleCount: Math.min(pendingAddNameRequest.relatedPeople.length, 12),
          confirmation: createConfirmation(pendingAddNameRequest.routed, completedPlan, pendingAddNameRequest.relatedPeople),
        });
        return;
      }

      const routed = routeKindiIntent(query);
      const commandTargetText = routed.kind === 'ACTION'
        ? extractKindiTargetText(routed.query)
        : routed.kind === 'UPDATE' || routed.kind === 'DELETE'
          ? extractKindiSubjectText(routed.query)
          : undefined;
      const searchQuery = routed.kind === 'QUERY' ? query : '';

      const [searchResults] = await Promise.all([
        searchQuery ? searchService.search(searchQuery, 200) : Promise.resolve([]),
        sleep(1000),
      ]);
      const allResults = searchResults.map((result) => result.person);
      const results = allResults.slice(0, 12);
      const resultCount = allResults.length;

      if (routed.kind === 'QUERY') {
        addAssistantMessage({
          text: resultCount > 0
            ? `وجدت ${resultCount} نتيجة مناسبة. أعرض لك أفضل ${results.length} نتيجة؛ اختر بطاقة للانتقال إليها في الشجرة.`
            : 'لم أجد نتيجة واضحة. جرب اسماً أدق أو علاقة مثل: أبناء محمود، حفيدات رنا، أو من مكة.',
          people: allResults,
          visiblePeopleCount: results.length,
        });
        return;
      }

      if (routed.kind === 'SUPPORT') {
        const contextPerson = lastContextPersonId ? peopleList.find((person) => person.id === lastContextPersonId) : undefined;
        addAssistantMessage({
          text: contextPerson
            ? `أنا جاهز. أستطيع البحث عن الأشخاص والعلاقات، أو تنفيذ إضافة وتعديل وحذف بعد بطاقة تأكيد. آخر شخص في السياق هو ${getFullName(contextPerson)}؛ يمكنك قول: أضف له ابناً اسمه علي، أو عدل تاريخ ميلاده إلى 1980-01-01.`
            : 'أنا جاهز. يمكنك أن تسألني عن الأشخاص والعلاقات والأماكن، أو تطلب إجراء مثل: أضف ابن اسمه علي لسامي، عدل تاريخ ميلاد محمود إلى 1980-01-01، أو احذف شخصاً بعد التأكيد.',
          people: contextPerson ? [contextPerson] : undefined,
          visiblePeopleCount: contextPerson ? 1 : 0,
        });
        return;
      }

      if (currentUserRole === 'viewer') {
        addAssistantMessage({
          text: 'عذراً، هذه الشجرة للقراءة فقط، لا يمكنني إجراء تعديلات لك.',
        });
        return;
      }

      if (routed.kind === 'ACTION') {
        const targetResolution = resolveKindiCommandTarget(commandTargetText, peopleList);
        const targetCandidates = targetResolution.candidates;
        if (targetResolution.status === 'not_found') {
          addAssistantMessage({
            text: `لم أجد "${commandTargetText}" في الشجرة. اكتب الاسم الأول واسم العائلة كما يظهران في البطاقة، أو اختر الشخص من البحث أولاً.`,
          });
          return;
        }

        if (targetResolution.status === 'ambiguous') {
          requestDisambiguation(routed, targetCandidates, targetCandidates, lastContextPersonId || focusId, commandTargetText);
          return;
        }
      } else {
        const subjectResolution = resolveKindiCommandTarget(commandTargetText, peopleList);
        const subjectCandidates = subjectResolution.candidates;
        if (subjectResolution.status === 'not_found') {
          addAssistantMessage({
            text: `لم أجد "${commandTargetText}" في الشجرة. اكتب الاسم كما يظهر في البطاقة قبل تنفيذ ${routed.kind === 'DELETE' ? 'الحذف' : 'التعديل'}.`,
          });
          return;
        }

        if (subjectResolution.status === 'ambiguous') {
          requestDisambiguation(routed, subjectCandidates, subjectCandidates, lastContextPersonId || focusId, commandTargetText || 'الشخص');
          return;
        }
      }

      const plan = createKindiExecutivePlan(routed, results, lastContextPersonId || focusId, { allPeople: peopleList });
      if (!plan) {
        addAssistantMessage({
          text:
            routed.kind === 'ACTION'
              ? 'فهمت أنك تريد إجراء تعديل على الشجرة، لكني أحتاج صياغة أوضح قبل التنفيذ. جرب: أضف بنت اسمها جورية لـ رمضان القرجي.'
              : routed.kind === 'DELETE'
                ? 'فهمت أنك تريد حذف شخص، لكني لم أستطع تحديد الهدف بدقة.'
                : 'فهمت أنك تريد تحديث بيانات، لكني لم أستطع تحديد الشخص أو الحقل بدقة. جرب: عدل تاريخ ميلاد محمود إلى 1980-01-01.',
          people: results,
        });
        return;
      }

      const selectedPerson = plan.type === 'ADD'
        ? peopleList.find((person) => person.id === plan.targetPersonId)
        : peopleList.find((person) => person.id === plan.personId);
      if (selectedPerson) setLastContextPersonId(selectedPerson.id);
      const confirmationPeople = selectedPerson ? [selectedPerson, ...results.filter((person) => person.id !== selectedPerson.id)] : results;

      if (plan.type === 'ADD' && !plan.name?.firstName) {
        requestMissingAddName({
          routed,
          plan,
          relatedPeople: confirmationPeople,
        });
        return;
      }

      addAssistantMessage({
        text: `${routed.summary}: "${query}". أعددت بطاقة تأكيد آمنة قبل التنفيذ.`,
        people: confirmationPeople,
        visiblePeopleCount: Math.min(confirmationPeople.length, 12),
        confirmation: createConfirmation(routed, plan, confirmationPeople),
      });
    } finally {
      setIsThinking(false);
    }
  }, [addAssistantMessage, currentUserRole, draft, focusId, hasPendingDecision, lastContextPersonId, pendingAddNameRequest, peopleList, requestDisambiguation, requestMissingAddName]);

  const chooseDisambiguation = useCallback((messageId: string, personId: string) => {
    const message = messages.find((item) => item.id === messageId);
    const disambiguation = message?.disambiguation;
    const selectedPerson = peopleList.find((person) => person.id === personId);
    if (!disambiguation || !selectedPerson) return;
    if (disambiguation.status && disambiguation.status !== 'pending') return;
    setLastContextPersonId(selectedPerson.id);

    setMessages((current) =>
      current.map((item) =>
        item.id === messageId && item.disambiguation
          ? { ...item, disambiguation: { ...item.disambiguation, status: 'resolved' } }
          : item
      )
    );

    const plan = createKindiExecutivePlan(
      disambiguation.routedIntent,
      disambiguation.resultPeople,
      disambiguation.fallbackFocusId,
      { allPeople: peopleList, selectedTarget: selectedPerson }
    );

    if (!plan) {
      addAssistantMessage({
        text: 'لم أستطع بناء خطة تنفيذ واضحة بعد اختيار الشخص. لم يتم تغيير أي بيانات.',
      });
      return;
    }

    const confirmationPeople = [
      selectedPerson,
      ...disambiguation.resultPeople.filter((person) => person.id !== selectedPerson.id),
    ];

    if (plan.type === 'ADD' && !plan.name?.firstName) {
      requestMissingAddName({
        routed: disambiguation.routedIntent,
        plan,
        relatedPeople: confirmationPeople,
      });
      return;
    }

    addAssistantMessage({
      text: `اخترت ${getFullName(selectedPerson)}. أعددت بطاقة التأكيد النهائية.`,
      people: confirmationPeople,
      visiblePeopleCount: Math.min(confirmationPeople.length, 12),
      confirmation: createConfirmation(disambiguation.routedIntent, plan, confirmationPeople),
    });
  }, [addAssistantMessage, messages, peopleList, requestMissingAddName]);

  const confirm = useCallback(async (confirmation: KindiConfirmation) => {
    if (confirmation.status && confirmation.status !== 'pending') return;

    const setConfirmationStatus = (
      status: NonNullable<KindiConfirmation['status']>,
      error?: string
    ) => setMessages((current) =>
      current.map((message) =>
        message.confirmation?.id === confirmation.id
          ? { ...message, confirmation: { ...message.confirmation, status, error } }
          : message
      )
    );

    setConfirmationStatus('processing');

    if (currentUserRole === 'viewer') {
      const error = 'هذه الشجرة للقراءة فقط، لا يمكنني إجراء تعديلات لك.';
      setConfirmationStatus('failed', error);
      addAssistantMessage({ text: `عذراً، ${error}` });
      return;
    }

    const plan = confirmation.plan;
    if (!plan) {
      const error = 'لم أجد خطة تنفيذ صالحة لهذا الطلب.';
      setConfirmationStatus('failed', error);
      addAssistantMessage({ text: `${error} لم يتم تغيير أي بيانات.` });
      return;
    }

    let result: MutationActionResult = { success: false, error: 'Unsupported Kindi action.' };

    if (plan.type === 'ADD') {
      if (!plan.name?.firstName) {
        const error = 'لا أستطيع تنفيذ الإضافة قبل معرفة اسم الشخص الجديد.';
        setConfirmationStatus('failed', error);
        addAssistantMessage({
          text: `${error} أعد الطلب مع الاسم، مثل: أضف ابن اسمه علي لسامي.`,
        });
        return;
      }

      if (plan.relation === 'parent') {
        result = await treeActions.addParent(plan.gender, undefined, false, plan.targetPersonId);
      } else if (plan.relation === 'spouse') {
        result = await treeActions.addSpouse(plan.gender, plan.targetPersonId);
      } else {
        result = await treeActions.addChild(plan.gender, undefined, false, plan.targetPersonId);
      }

      if (!result.success) {
        const error = result.error || 'تعذر تنفيذ الإضافة. لم أستطع حفظ العملية في مسار المزامنة.';
        setConfirmationStatus('failed', error);
        addAssistantMessage({ text: error });
        return;
      }

      const addedId = useAppStore.getState().focusId;
      if (plan.name && addedId) {
        const nameUpdates: Partial<Person> = {};
        if (plan.name.firstName) nameUpdates.firstName = plan.name.firstName;
        if (plan.name.lastName) nameUpdates.lastName = plan.name.lastName;

        if (Object.keys(nameUpdates).length > 0) {
          const nameResult = await treeActions.updatePerson(addedId, nameUpdates);
          if (!nameResult.success) {
            const error = nameResult.error || 'تمت الإضافة، لكن تعذر تحديث الاسم في مسار المزامنة.';
            setConfirmationStatus('failed', error);
            addAssistantMessage({ text: error });
            return;
          }
        }
      }

      const addedPerson = useAppStore.getState().people[addedId];
      setConfirmationStatus('confirmed');
      addAssistantMessage({
        text: `تمت إضافة ${addedPerson ? getFullName(addedPerson) : 'الشخص الجديد'} إلى الشجرة بنجاح! هل تود الانتقال إليه؟`,
        people: addedPerson ? [addedPerson] : undefined,
      });
      return;
    }

    if (plan.type === 'UPDATE') {
      result = await treeActions.updatePerson(plan.personId, plan.updates);
      if (!result.success) {
        const error = result.error || 'تعذر تنفيذ التعديل. لم أستطع حفظ العملية في مسار المزامنة.';
        setConfirmationStatus('failed', error);
        addAssistantMessage({ text: error });
        return;
      }

      const updatedPerson = useAppStore.getState().people[plan.personId];
      setConfirmationStatus('confirmed');
      addAssistantMessage({
        text: `أبشر، تم تحديث بيانات ${updatedPerson ? getFullName(updatedPerson) : 'الشخص'} كما طلبت.`,
        people: updatedPerson ? [updatedPerson] : confirmation.relatedPeople,
      });
      return;
    }

    const deleteTarget = useAppStore.getState().people[plan.personId];
    result = await treeActions.deletePerson(plan.personId);
    if (!result.success) {
      const error = result.error || 'تعذر تنفيذ الحذف. لم أستطع حفظ العملية في مسار المزامنة.';
      setConfirmationStatus('failed', error);
      addAssistantMessage({ text: error });
      return;
    }

    setConfirmationStatus('confirmed');
    addAssistantMessage({
      text: `تم حذف ${deleteTarget ? getFullName(deleteTarget) : 'الشخص'} من الشجرة بنجاح.`,
    });
  }, [addAssistantMessage, currentUserRole, treeActions]);

  const cancel = useCallback((confirmation?: KindiConfirmation) => {
    setPendingAddNameRequest(null);
    if (confirmation?.status && confirmation.status !== 'pending') return;

    if (confirmation) {
      setMessages((current) =>
        current.map((message) =>
          message.confirmation?.id === confirmation.id
            ? { ...message, confirmation: { ...message.confirmation, status: 'cancelled' } }
            : message
        )
      );
    }

    addAssistantMessage({
      text: 'تم إلغاء الطلب. لم يتم تغيير أي بيانات.',
    });
  }, [addAssistantMessage]);

  const cancelDisambiguation = useCallback((messageId: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.disambiguation
          ? { ...message, disambiguation: { ...message.disambiguation, status: 'cancelled' } }
          : message
      )
    );
    setPendingAddNameRequest(null);
    addAssistantMessage({
      text: 'تم إلغاء الاختيار. لم أنفذ أي أمر على الشجرة.',
    });
  }, [addAssistantMessage]);

  const showMorePeople = useCallback((messageId: string) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId || !message.people) return message;

        const currentVisibleCount = message.visiblePeopleCount ?? message.people.length;
        return {
          ...message,
          visiblePeopleCount: Math.min(currentVisibleCount + 12, message.people.length),
        };
      })
    );
  }, []);

  return {
    isOpen,
    setIsOpen,
    draft,
    setDraft,
    messages,
    isThinking,
    submit,
    focusPerson,
    confirm,
    cancel,
    cancelDisambiguation,
    showMorePeople,
    chooseDisambiguation,
    hasPendingDecision,
  };
};
