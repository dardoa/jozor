import { describe, expect, it } from 'vitest';

import type { Person } from '../../../types';
import type { KindiRoutedIntent } from '../types';
import {
  createKindiExecutivePlan,
  extractKindiTargetText,
  findKindiTargetCandidates,
  parseKindiCommand,
  parseKindiProvidedName,
  resolveKindiCommandTarget,
} from '../kindiExecutivePlanner';

const person = (id: string, firstName: string): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'Test',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
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
  partnerDetails: {},
});

const routed = (kind: KindiRoutedIntent['kind'], query: string): KindiRoutedIntent => ({
  kind,
  query,
  parsedIntents: [],
  targetText: query,
  summary: kind,
});

describe('createKindiExecutivePlan', () => {
  it('plans adding a named son to the matched person', () => {
    const plan = createKindiExecutivePlan(
      routed('ACTION', 'add son named Adam to Mahmoud'),
      [person('p1', 'Mahmoud')],
      'fallback',
      [person('p1', 'Mahmoud')]
    );

    expect(plan).toMatchObject({
      type: 'ADD',
      relation: 'child',
      gender: 'male',
      targetPersonId: 'p1',
      name: { firstName: 'Adam' },
    });
  });

  it('prefers the explicitly mentioned add target over the open person fallback', () => {
    const openPerson = person('y', 'Yousef');
    const targetPerson = { ...person('x', 'Ramadan'), lastName: 'Alqarji' };

    const plan = createKindiExecutivePlan(
      routed('ACTION', 'أضف بنت لـ Ramadan Alqarji'),
      [openPerson],
      openPerson.id,
      [openPerson, targetPerson]
    );

    expect(plan).toMatchObject({
      type: 'ADD',
      relation: 'child',
      gender: 'female',
      targetPersonId: 'x',
      targetPersonName: 'Ramadan Alqarji',
    });
  });

  it('extracts Arabic targets attached to the lam preposition', () => {
    const openPerson = person('y', 'Yousef');
    const sami = { ...person('s', 'سامي'), lastName: 'القرجي' };
    const intent = routed('ACTION', 'اضف ابن لسامي القرجي');

    expect(parseKindiCommand(intent.query)).toMatchObject({
      relation: 'child',
      gender: 'male',
      targetMention: 'سامي القرجي',
    });
    expect(parseKindiCommand(intent.query).newPersonName).toBeUndefined();

    const plan = createKindiExecutivePlan(intent, [openPerson], openPerson.id, [openPerson, sami]);
    expect(plan).toMatchObject({
      type: 'ADD',
      relation: 'child',
      gender: 'male',
      targetPersonId: 's',
      targetPersonName: 'سامي القرجي',
    });
  });

  it('parses a follow-up name without command words', () => {
    expect(parseKindiProvidedName('علي القرجي')).toEqual({
      firstName: 'علي',
      lastName: 'القرجي',
    });
    expect(parseKindiProvidedName('اسمه آدم')).toEqual({
      firstName: 'آدم',
      lastName: undefined,
    });
  });

  it('does not fall back to the open person when an explicit target is missing', () => {
    const openPerson = person('y', 'Yousef');
    const plan = createKindiExecutivePlan(
      routed('ACTION', 'اضف ابن لسامي القرجي'),
      [openPerson],
      openPerson.id,
      [openPerson]
    );

    expect(plan).toBeNull();
  });

  it('extracts separated Arabic lam targets and refuses unrelated command targets', () => {
    const abdullah = { ...person('a', 'عبد'), lastName: 'الله' };
    const mahmoud = { ...person('m', 'محمود'), lastName: 'القرجي' };
    const query = 'اضف زوجة ل عبد الله';

    expect(parseKindiCommand(query)).toMatchObject({
      relation: 'spouse',
      gender: 'female',
    });
    expect(extractKindiTargetText(query)).toBe('عبد الله');
    expect(resolveKindiCommandTarget(extractKindiTargetText(query), [abdullah, mahmoud])).toMatchObject({
      status: 'exact',
      candidates: [{ id: 'a' }],
    });
    expect(resolveKindiCommandTarget('عبد الله', [mahmoud])).toEqual({
      status: 'not_found',
      candidates: [],
    });
  });

  it('does not classify wife commands as mother when the target name contains ام', () => {
    expect(parseKindiCommand('اضف زوجة ل اسامة القرجي')).toMatchObject({
      relation: 'spouse',
      gender: 'female',
      targetMention: 'اسامة القرجي',
    });
  });

  it('parses nominal Arabic add commands without treating the verb as a new person name', () => {
    expect(parseKindiCommand('اضافة زوجة ل صبيحة')).toMatchObject({
      relation: 'spouse',
      gender: 'female',
      targetMention: 'صبيحة',
      newPersonName: undefined,
    });

    expect(parseKindiCommand('إضافة زوجة اسمها نورة ل صبيحة')).toMatchObject({
      relation: 'spouse',
      gender: 'female',
      targetMention: 'صبيحة',
      newPersonName: { firstName: 'نورة' },
    });
  });

  it('separates the existing target from the new person name in one Arabic sentence', () => {
    const target = {
      ...person('mk', 'محمد'),
      middleName: 'خير',
      lastName: 'القرجي',
    };
    const query = 'ضيف ابن ل محمد خير القرجي اسمه امرا';

    expect(parseKindiCommand(query)).toMatchObject({
      relation: 'child',
      gender: 'male',
      targetMention: 'محمد خير القرجي',
      newPersonName: { firstName: 'امرا' },
    });

    const plan = createKindiExecutivePlan(
      routed('ACTION', query),
      [],
      'fallback',
      [target]
    );

    expect(plan).toMatchObject({
      type: 'ADD',
      relation: 'child',
      gender: 'male',
      targetPersonId: 'mk',
      targetPersonName: 'محمد خير القرجي',
      name: { firstName: 'امرا' },
    });
  });

  it('also separates the new person name when the name marker comes before the target', () => {
    const target = {
      ...person('mk', 'محمد'),
      middleName: 'خير',
      lastName: 'القرجي',
    };
    const query = 'اضف ابن اسمه علي لمحمد خير القرجي';

    expect(parseKindiCommand(query)).toMatchObject({
      relation: 'child',
      gender: 'male',
      targetMention: 'محمد خير القرجي',
      newPersonName: { firstName: 'علي' },
    });

    const plan = createKindiExecutivePlan(
      routed('ACTION', query),
      [],
      'fallback',
      [target]
    );

    expect(plan).toMatchObject({
      type: 'ADD',
      targetPersonId: 'mk',
      name: { firstName: 'علي' },
    });
  });

  it('returns multiple target candidates and honors the selected person', () => {
    const openPerson = person('y', 'Yousef');
    const firstTarget = { ...person('x1', 'Ramadan'), lastName: 'Alqarji' };
    const secondTarget = { ...person('x2', 'Ramadan'), lastName: 'Alqarji' };
    const allPeople = [openPerson, firstTarget, secondTarget];
    const intent = routed('ACTION', 'أضف بنت لـ Ramadan Alqarji');
    const targetText = extractKindiTargetText(intent.query);

    const candidates = findKindiTargetCandidates(targetText, allPeople);
    expect(candidates.map((candidate) => candidate.id)).toEqual(['x1', 'x2']);

    const plan = createKindiExecutivePlan(intent, [openPerson], openPerson.id, {
      allPeople,
      selectedTarget: secondTarget,
    });

    expect(plan).toMatchObject({
      type: 'ADD',
      relation: 'child',
      gender: 'female',
      targetPersonId: 'x2',
      targetPersonName: 'Ramadan Alqarji',
    });
  });

  it('collects all literal two-word target matches across name fields', () => {
    const first = { ...person('m1', 'محمد'), lastName: 'القرجي' };
    const second = { ...person('m2', 'محمد'), middleName: 'القرجي', lastName: '' };
    const third = { ...person('m3', 'محمد'), middleName: 'علي', lastName: 'القرجي' };
    const unrelated = { ...person('x', 'محمود'), middleName: 'محمد', lastName: 'القرجي' };

    expect(findKindiTargetCandidates('محمد القرجي', [first, second, third, unrelated]).map((item) => item.id))
      .toEqual(['m1', 'm2', 'm3']);
  });

  it('matches a compound Arabic target name before the provided child name', () => {
    const target = {
      ...person('ma', 'محمد'),
      middleName: 'علي',
      lastName: 'القرجي',
    };
    const query = 'اضف ابن لمحمد علي القرجي اسمه غسان';

    expect(parseKindiCommand(query)).toMatchObject({
      relation: 'child',
      gender: 'male',
      targetMention: 'محمد علي القرجي',
      newPersonName: { firstName: 'غسان' },
    });

    const plan = createKindiExecutivePlan(
      routed('ACTION', query),
      [],
      'fallback',
      [target]
    );

    expect(plan).toMatchObject({
      type: 'ADD',
      relation: 'child',
      gender: 'male',
      targetPersonId: 'ma',
      name: { firstName: 'غسان' },
    });
  });

  it('matches a compound Arabic target by full-name prefix', () => {
    const target = {
      ...person('ma', 'محمد'),
      middleName: 'علي',
      lastName: 'القرجي',
    };

    expect(findKindiTargetCandidates('محمد علي', [target]).map((item) => item.id))
      .toEqual(['ma']);
  });

  it('plans birth date updates without treating the date as a name', () => {
    const plan = createKindiExecutivePlan(
      routed('UPDATE', 'update birth date for Mahmoud to 1980-01-01'),
      [person('p1', 'Mahmoud')],
      'fallback'
    );

    expect(plan).toEqual({
      type: 'UPDATE',
      personId: 'p1',
      updates: { birthDate: '1980-01-01' },
    });
  });

  it('extracts Arabic update subjects before the new value', () => {
    const target = {
      ...person('p1', 'محمود'),
      middleName: 'محمد رمضان',
      lastName: 'القرجي',
    };

    const middleNamePlan = createKindiExecutivePlan(
      routed('UPDATE', 'عدل الاسم الاوسط ل محمود محمد رمضان القرجي ليكون فارغ'),
      [target],
      'fallback',
      [target]
    );

    expect(middleNamePlan).toEqual({
      type: 'UPDATE',
      personId: 'p1',
      updates: { middleName: '' },
    });

    const birthDatePlan = createKindiExecutivePlan(
      routed('UPDATE', 'عدل تاريخ ميلاد محمود القرجي الى 2019'),
      [target],
      'fallback',
      [target]
    );

    expect(birthDatePlan).toEqual({
      type: 'UPDATE',
      personId: 'p1',
      updates: { birthDate: '2019' },
    });
  });

  it('plans expanded updates for profession, places, and notes', () => {
    const target = person('p1', 'Mahmoud');

    expect(createKindiExecutivePlan(
      routed('UPDATE', 'update profession Mahmoud to Engineer'),
      [target],
      'fallback',
      [target]
    )).toMatchObject({
      type: 'UPDATE',
      personId: 'p1',
      updates: { profession: 'Engineer' },
    });

    expect(createKindiExecutivePlan(
      routed('UPDATE', 'عدل مكان الميلاد محمود إلى مكة'),
      [target],
      'fallback',
      [target]
    )).toMatchObject({
      type: 'UPDATE',
      updates: { birthPlace: 'مكة' },
    });

    expect(createKindiExecutivePlan(
      routed('UPDATE', 'عدل ملاحظات محمود إلى شاعر معروف'),
      [target],
      'fallback',
      [target]
    )).toMatchObject({
      type: 'UPDATE',
      updates: { bio: 'شاعر معروف' },
    });
  });

  it('plans delete actions against the resolved subject', () => {
    const target = person('p1', 'Sami');
    const plan = createKindiExecutivePlan(
      routed('DELETE', 'delete Sami'),
      [target],
      'fallback',
      [target]
    );

    expect(plan).toEqual({
      type: 'DELETE',
      personId: 'p1',
    });
  });
});
