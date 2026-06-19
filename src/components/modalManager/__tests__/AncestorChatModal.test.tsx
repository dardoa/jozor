import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OverlayProvider } from '../../../context/OverlayContext';
import type { Person } from '../../../types';
import { AncestorChatModal } from '../AncestorChatModal';
import { startAncestorChat } from '../../../services/geminiService';

vi.mock('../../../services/geminiService', () => ({
  startAncestorChat: vi.fn(),
}));

const makePerson = (): Person => ({
  id: 'person-1',
  title: '',
  firstName: 'Mahmoud',
  middleName: '',
  lastName: 'Jozor',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '1930-01-01',
  birthPlace: 'Kafranbel',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
  deathDate: '1990-01-01',
  deathPlace: 'Kafranbel',
  deathSource: '',
  isDeceased: true,
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
  burialPlace: '',
  residence: '',
  partnerDetails: {},
  isPrivate: false,
});

const renderModal = (person = makePerson()) => {
  render(
    <OverlayProvider>
      <AncestorChatModal
        isOpen
        onClose={vi.fn()}
        person={person}
        people={{ [person.id]: person }}
        language="ar"
      />
    </OverlayProvider>
  );
};

describe('AncestorChatModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Arabic labels without mojibake', () => {
    renderModal();

    expect(screen.getByText('الدردشة مع السلف')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('اكتب سؤالك هنا...')).toBeInTheDocument();
  });

  it('shows a clear failure message when the AI reply fails', async () => {
    vi.mocked(startAncestorChat).mockRejectedValueOnce(new Error('AI unavailable'));
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('اكتب سؤالك هنا...'), {
      target: { value: 'من أنت؟' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));

    expect(await screen.findByText('من أنت؟')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('تعذر توليد الرد الآن. تحقق من اتصال الذكاء الاصطناعي ثم حاول مرة أخرى.')).toBeInTheDocument();
    });
  });
});
