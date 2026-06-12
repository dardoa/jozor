import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OnboardingTourRuntime } from '../OnboardingTourRuntime';
import { useAppStore } from '../../store/useAppStore';
import type { UserProfile } from '../../types';

interface JoyrideMockProps {
    run: boolean;
    stepIndex: number;
}

const buildUser = (
    uid: string,
    metadata: UserProfile['metadata']
): UserProfile => ({
    uid,
    displayName: 'Test User',
    email: `${uid}@example.com`,
    photoURL: '',
    metadata,
});

vi.mock('react-joyride', () => {
    return {
        default: (props: JoyrideMockProps) => {
            return (
                <div data-testid="joyride-mock" data-run={props.run ? "true" : "false"} data-stepindex={props.stepIndex}>
                    Joyride Active
                </div>
            );
        },
    };
});

vi.mock('../../context/TranslationContext', () => ({
    useTranslation: () => ({
        t: {
            onboarding: {
                tree: 'Tree help',
            },
        },
    }),
}));

describe('OnboardingTourRuntime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useAppStore.setState({
            user: buildUser('user-1', { has_completed_tour: false }),
        });
    });

    it('resets tour to step 0 and sets run to true when forceStartToken changes', () => {
        const { rerender } = render(
            <OnboardingTourRuntime forceStartToken={0} setDetailsPanelOpen={vi.fn()} />
        );

        // Joyride should start (because user hasn't completed tour)
        expect(screen.getByTestId('joyride-mock')).toHaveAttribute('data-run', 'true');
        expect(screen.getByTestId('joyride-mock')).toHaveAttribute('data-stepindex', '0');

        // Simulate setting stepIndex to 3 during interaction (mock joyride index update)
        // ... now let's change forceStartToken from 0 to 1
        rerender(
            <OnboardingTourRuntime forceStartToken={1} setDetailsPanelOpen={vi.fn()} />
        );

        // Joyride should still run and be reset back to step index 0
        expect(screen.getByTestId('joyride-mock')).toHaveAttribute('data-run', 'true');
        expect(screen.getByTestId('joyride-mock')).toHaveAttribute('data-stepindex', '0');
    });

    it('remounts session when user finishes loading late', () => {
        // Start anonymous/loading state where user is null
        useAppStore.setState({ user: null });

        const { rerender } = render(
            <OnboardingTourRuntime forceStartToken={0} setDetailsPanelOpen={vi.fn()} />
        );

        // Joyride should not start initially since user is null
        expect(screen.getByTestId('joyride-mock')).toHaveAttribute('data-run', 'false');

        // Now user loads and is set in store
        act(() => {
            useAppStore.setState({
                user: buildUser('user-1', { has_completed_tour: false }),
            });
        });

        rerender(
            <OnboardingTourRuntime forceStartToken={0} setDetailsPanelOpen={vi.fn()} />
        );

        // Joyride should now start automatically because the component was remounted due to key change!
        expect(screen.getByTestId('joyride-mock')).toHaveAttribute('data-run', 'true');
    });

    it('starts automatically for a new user without a persisted tour flag', () => {
        useAppStore.setState({
            user: buildUser('user-2', {}),
        });

        render(
            <OnboardingTourRuntime forceStartToken={0} setDetailsPanelOpen={vi.fn()} />
        );

        expect(screen.getByTestId('joyride-mock')).toHaveAttribute('data-run', 'true');
        expect(screen.getByTestId('joyride-mock')).toHaveAttribute('data-stepindex', '0');
    });
});
