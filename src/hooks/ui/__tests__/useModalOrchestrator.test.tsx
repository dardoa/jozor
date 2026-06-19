
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { useModalOrchestrator } from '../useModalOrchestrator';
import { useAppStore } from '../../../store/useAppStore';

// Simple test component to exercise the hook
const TestComponent: React.FC = () => {
  const {
    detailsPanelOpen,
    setDetailsPanelOpen,
    modals,
    handleOpenModal,
  } = useModalOrchestrator();

  return (
    <div>
      <div data-testid="details-panel-state">{detailsPanelOpen ? 'open' : 'closed'}</div>
      <div data-testid="active-modal">{modals.activeModal ?? 'none'}</div>
      <div data-testid="modal-source-person">{modals.modalContext?.sourcePersonId ?? 'none'}</div>
      <div data-testid="journey-mode">{modals.geographicJourneyMode}</div>

      <button onClick={() => setDetailsPanelOpen(true)}>Open Details Panel</button>
      <button onClick={() => setDetailsPanelOpen(false)}>Close Details Panel</button>
      <button onClick={() => handleOpenModal('login')}>Open Login Modal</button>
      <button onClick={() => handleOpenModal('map', { sourcePersonId: 'person-1' })}>Open Person Map</button>
      <button onClick={() => handleOpenModal('map')}>Open Event Journey</button>
      <button onClick={() => handleOpenModal('migrationMap')}>Open Migration Journey</button>
    </div>
  );
};

describe('useModalOrchestrator', () => {
  beforeEach(() => {
    // Reset Zustand store to a minimal, known state for each test
    useAppStore.setState({
      history: [],
      future: [],
    }  as never);
  });

  it('should have details panel closed by default and toggle open/close correctly', () => {
    render(<TestComponent />);

    const detailsPanelState = screen.getByTestId('details-panel-state');
    expect(detailsPanelState.textContent).toBe('closed');

    // Open
    fireEvent.click(screen.getByText('Open Details Panel'));
    expect(detailsPanelState.textContent).toBe('open');

    // Close
    fireEvent.click(screen.getByText('Close Details Panel'));
    expect(detailsPanelState.textContent).toBe('closed');
  });

  it('should update activeModal when handleOpenModal is called', () => {
    render(<TestComponent />);

    const activeModal = screen.getByTestId('active-modal');
    expect(activeModal.textContent).toBe('none');

    fireEvent.click(screen.getByText('Open Login Modal'));

    // The modal orchestrator should now report an active modal
    expect(activeModal.textContent).toBe('login');
  });

  it('routes map and migration entries through the unified geographic journey modal', () => {
    render(<TestComponent />);

    const activeModal = screen.getByTestId('active-modal');
    const journeyMode = screen.getByTestId('journey-mode');

    fireEvent.click(screen.getByText('Open Event Journey'));
    expect(activeModal.textContent).toBe('geographicJourney');
    expect(journeyMode.textContent).toBe('events');

    fireEvent.click(screen.getByText('Open Migration Journey'));
    expect(activeModal.textContent).toBe('geographicJourney');
    expect(journeyMode.textContent).toBe('migration');
  });

  it('stores modal context for person-scoped overlays and clears it for generic opens', () => {
    render(<TestComponent />);

    const sourcePerson = screen.getByTestId('modal-source-person');

    fireEvent.click(screen.getByText('Open Person Map'));
    expect(sourcePerson.textContent).toBe('person-1');

    fireEvent.click(screen.getByText('Open Login Modal'));
    expect(sourcePerson.textContent).toBe('none');
  });
});
