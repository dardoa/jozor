import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FanChart } from '../FanChart';
import type { FanArc, Person } from '../../../types';

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'root-person',
  title: '',
  firstName: 'Salem',
  middleName: '',
  lastName: 'Alharbi',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '1948-01-01',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
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
  photoUrl: 'https://example.com/root.jpg',
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
  ...overrides,
});

const renderFanChart = (person: Person, privacyMode: boolean) => {
  const fanArc: FanArc = {
    id: person.id,
    person,
    startAngle: 0,
    endAngle: Math.PI * 2,
    innerRadius: 0,
    outerRadius: 120,
    depth: 0,
    value: 1,
    hasChildren: true,
  };

  return render(
    <svg>
      <FanChart
        fanArcs={[fanArc]}
        people={{ [person.id]: person }}
        privacyMode={privacyMode}
        onSelect={() => undefined}
        onNodeContextMenu={() => undefined}
        zoomScale={1}
      />
    </svg>
  );
};

describe('FanChart privacy mode', () => {
  it('renders the root photo when privacy mode is disabled', () => {
    const person = buildPerson();

    renderFanChart(person, false);

    expect(screen.getByRole('img', { name: 'Salem Alharbi' })).toBeInTheDocument();
  });

  it('replaces the root photo with the age-aware privacy placeholder when privacy mode is enabled', () => {
    const person = buildPerson({ gender: 'male', birthDate: '1948-01-01' });

    renderFanChart(person, true);

    expect(screen.queryByRole('img', { name: 'Salem Alharbi' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Privacy placeholder: male senior')).toBeInTheDocument();
  });

  it('uses the correct female youth placeholder in radial mode', () => {
    const person = buildPerson({
      id: 'youth-female',
      firstName: 'Noura',
      lastName: 'Saleh',
      gender: 'female',
      birthDate: '2010-01-01',
      photoUrl: 'https://example.com/noura.jpg',
    });

    renderFanChart(person, true);

    expect(screen.queryByRole('img', { name: 'Noura Saleh' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Privacy placeholder: female youth')).toBeInTheDocument();
  });
});
