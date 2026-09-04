import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import KindiOverlayWrapper from '../components/KindiOverlayWrapper';

const captured = vi.hoisted(() => ({
  speechOptions: undefined as undefined | {
    onResult?: (text: string) => void;
    onError?: (error: string) => void;
  },
  overlayProps: undefined as undefined | {
    voiceError?: string | null;
    onClose?: () => void;
    onFocusPerson?: (personId: string) => void;
    onOpenPersonRecord?: (
      personId: string,
      targetTab?: 'about' | 'links',
      targetSection?: 'overview' | 'workBio' | 'relationships',
      targetField?: 'parents'
    ) => void;
    onPrepareDiagnosticUpdate?: (suggestion: { targetPersonId: string }) => boolean;
  },
}));

const controller = vi.hoisted(() => ({
  isOpen: true,
  setIsOpen: vi.fn(),
  draft: '',
  setDraft: vi.fn(),
  messages: [],
  isThinking: false,
  submit: vi.fn(),
  focusPerson: vi.fn(),
  confirm: vi.fn(),
  cancel: vi.fn(),
  cancelDisambiguation: vi.fn(),
  showMorePeople: vi.fn(),
  chooseDisambiguation: vi.fn(),
  hasPendingDecision: false,
  currentContextPerson: undefined,
  startNewConversation: vi.fn(),
  undoKindiChange: vi.fn(),
  rateKindiAnswer: vi.fn(),
  canPrepareDiagnosticUpdate: true,
  prepareDiagnosticUpdate: vi.fn(() => true),
}));

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: {
      kindi: {
        voiceError: 'Voice recognition failed. Try again or type the message instead.',
      },
    },
  }),
}));

vi.mock('../../../hooks/utils/useSpeechToText', () => ({
  useSpeechToText: (options: typeof captured.speechOptions) => {
    captured.speechOptions = options;
    return {
      isListening: false,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      isSupported: true,
    };
  },
}));

vi.mock('../hooks/useKindiController', () => ({
  useKindiController: () => controller,
}));

vi.mock('../components/KindiOverlay', () => ({
  KindiOverlay: (props: typeof captured.overlayProps) => {
    captured.overlayProps = props;
    return props?.voiceError
      ? <div role="alert">{props.voiceError}</div>
      : <div data-testid="kindi-overlay" />;
  },
}));

describe('KindiOverlayWrapper voice review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('places the transcript in the draft without sending it automatically', () => {
    render(<KindiOverlayWrapper isOpen onClose={vi.fn()} people={{}} onFocusPerson={vi.fn()} />);

    act(() => {
      captured.speechOptions?.onResult?.('review this transcript');
    });

    expect(controller.setDraft).toHaveBeenCalledWith('review this transcript');
    expect(controller.submit).not.toHaveBeenCalled();
  });

  it('shows a localized error when speech recognition fails', () => {
    render(<KindiOverlayWrapper isOpen onClose={vi.fn()} people={{}} onFocusPerson={vi.fn()} />);

    act(() => {
      captured.speechOptions?.onError?.('network');
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Voice recognition failed. Try again or type the message instead.'
    );
  });

  it('closes the controller and parent atomically', () => {
    const onClose = vi.fn();
    render(<KindiOverlayWrapper isOpen onClose={onClose} people={{}} onFocusPerson={vi.fn()} />);

    act(() => {
      captured.overlayProps?.onClose?.();
    });

    expect(controller.setIsOpen).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the parent when focusing a person from Kindi', () => {
    const onClose = vi.fn();
    render(<KindiOverlayWrapper isOpen onClose={onClose} people={{}} onFocusPerson={vi.fn()} />);

    act(() => {
      captured.overlayProps?.onFocusPerson?.('person-1');
    });

    expect(controller.focusPerson).toHaveBeenCalledWith('person-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the canonical person record and closes Kindi atomically', () => {
    const onClose = vi.fn();
    const onOpenPersonRecord = vi.fn();
    render(
      <KindiOverlayWrapper
        isOpen
        onClose={onClose}
        people={{}}
        onFocusPerson={vi.fn()}
        onOpenPersonRecord={onOpenPersonRecord}
      />
    );

    act(() => {
      captured.overlayProps?.onOpenPersonRecord?.('person-1', 'links', 'relationships', 'parents');
    });

    expect(controller.setIsOpen).toHaveBeenCalledWith(false);
    expect(controller.focusPerson).not.toHaveBeenCalled();
    expect(onOpenPersonRecord).toHaveBeenCalledWith('person-1', 'links', 'relationships', 'parents');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('forwards the guarded guided-update callback without closing Kindi', () => {
    const onClose = vi.fn();
    render(<KindiOverlayWrapper isOpen onClose={onClose} people={{}} onFocusPerson={vi.fn()} />);
    const suggestion = { targetPersonId: 'person-1' };

    expect(captured.overlayProps?.onPrepareDiagnosticUpdate?.(suggestion)).toBe(true);
    expect(controller.prepareDiagnosticUpdate).toHaveBeenCalledWith(suggestion);
    expect(onClose).not.toHaveBeenCalled();
  });
});
