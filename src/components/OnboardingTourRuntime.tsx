import React, { useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useTranslation } from '../context/TranslationContext';
import { useAppStore } from '../store/useAppStore';

interface OnboardingTourRuntimeProps {
    forceStartToken: number;
    setDetailsPanelOpen: (open: boolean) => void;
}

const TOUR_STORAGE_KEY = 'jozor_onboarding_completed';

interface OnboardingTourSessionProps {
    forceStartToken: number;
    setDetailsPanelOpen: (open: boolean) => void;
    user: ReturnType<typeof useAppStore.getState>['user'];
    updateTourStatus: ReturnType<typeof useAppStore.getState>['updateTourStatus'];
}

const OnboardingTourSession: React.FC<OnboardingTourSessionProps> = ({
    forceStartToken,
    setDetailsPanelOpen,
    user,
    updateTourStatus,
}) => {
    const { t } = useTranslation();

    const [run, setRun] = useState(() => {
        if (forceStartToken > 0) return true;

        const localCompleted = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
        if (localCompleted) return false;

        if (user && user.metadata) {
            if (user.metadata.has_completed_tour === false) {
                if (localStorage.getItem(TOUR_STORAGE_KEY) !== 'true') {
                    return true;
                }
            }
        }
        return false;
    });

    const [stepIndex, setStepIndex] = useState(0);

    const steps: Step[] = [
        {
            target: '#family-tree-canvas',
            content: t.onboarding?.tree,
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#tree-search-input',
            content: t.onboarding?.search,
            placement: 'bottom',
        },
        {
            target: '#user-menu-trigger',
            content: t.onboarding?.avatarHub,
            placement: 'bottom',
        },
        {
            target: '#geomap-tool-item',
            content: t.onboarding?.geoMap,
            placement: 'right',
        },
        {
            target: '#privacy-toggle-item',
            content: t.onboarding?.privacy,
            placement: 'left',
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, action, index } = data;

        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
            setRun(false);
            updateTourStatus(true);
            localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            if (index === 3 && action === ACTIONS.NEXT) {
                setDetailsPanelOpen(true);
            }

            if (action === ACTIONS.NEXT) {
                setStepIndex(index + 1);
            } else if (action === ACTIONS.PREV) {
                setStepIndex(index - 1);
            }
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: 'var(--surface-panel)',
                    backgroundColor: 'transparent',
                    overlayColor: 'rgba(66, 66, 66, 0.18)',
                    primaryColor: 'var(--primary-600)',
                    textColor: 'var(--text-main)',
                    zIndex: 1000,
                },
                tooltip: {
                    background: 'var(--surface-panel)',
                    backdropFilter: 'blur(18px)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border-soft)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '1.5rem',
                    color: 'var(--text-main)',
                },
                tooltipContainer: {
                    textAlign: 'start',
                },
                tooltipContent: {
                    padding: '1rem 0',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    color: 'var(--text-secondary)',
                },
                buttonNext: {
                    backgroundColor: 'var(--primary-600)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    padding: '0.6rem 1.2rem',
                },
                buttonBack: {
                    color: 'var(--text-muted)',
                    marginRight: '0.5rem',
                    fontSize: '0.8rem',
                },
                buttonSkip: {
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                },
            }}
            floaterProps={{
                disableAnimation: false,
            }}
        />
    );
};

export const OnboardingTourRuntime: React.FC<OnboardingTourRuntimeProps> = ({
    forceStartToken,
    setDetailsPanelOpen,
}) => {
    const user = useAppStore((state) => state.user);
    const updateTourStatus = useAppStore((state) => state.updateTourStatus);

    const tourStatus =
        user?.metadata?.has_completed_tour === undefined
            ? 'pending'
            : user.metadata.has_completed_tour
            ? 'completed'
            : 'available';

    const sessionKey = `${forceStartToken}:${user?.uid ?? 'anonymous'}:${tourStatus}`;

    return (
        <OnboardingTourSession
            key={sessionKey}
            forceStartToken={forceStartToken}
            setDetailsPanelOpen={setDetailsPanelOpen}
            user={user}
            updateTourStatus={updateTourStatus}
        />
    );
};
