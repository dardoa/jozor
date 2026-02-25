import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useTranslation } from '../context/TranslationContext';
import { useAppStore } from '../store/useAppStore';

interface OnboardingTourProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

const TOUR_STORAGE_KEY = 'jozor_onboarding_completed';

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ sidebarOpen, setSidebarOpen }) => {
    const { t } = useTranslation();
    const user = useAppStore((state) => state.user);
    const updateTourStatus = useAppStore((state) => state.updateTourStatus);

    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const steps: Step[] = [
        {
            target: '#family-tree-canvas',
            content: t.onboardingTree || 'This is your interactive Family Tree. Click and drag to explore, or zoom in for specific details.',
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#tree-search-input',
            content: t.onboardingSearch || 'Use the Smart Search (Top Right) to instantly find any relative in your tree.',
            placement: 'bottom',
        },
        {
            target: '#user-menu-trigger',
            content: t.onboardingAvatarHub || 'Click your avatar to access the Tools Hub (Map, Stats, Timeline, and History).',
            placement: 'bottom',
        },
        {
            target: '#geomap-tool-item',
            content: t.onboardingGeoMap || 'Explore where your family came from in the Worldwide Geographic Map.',
            placement: 'right',
        },
        {
            target: '#privacy-toggle-item',
            content: t.onboardingPrivacy || 'Control your privacy. Mark family members as "Private" to hide them during exports.',
            placement: 'left',
        },
    ];

    useEffect(() => {
        // Check local storage first for instant feedback (blocks flash)
        const localCompleted = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
        if (localCompleted) return;

        // Wait for user and metadata to be sure
        if (user && user.metadata) {
            if (user.metadata.has_completed_tour === undefined || user.metadata.has_completed_tour === false) {
                // Double check local storage again just in case it was updated in another tab/instance
                if (localStorage.getItem(TOUR_STORAGE_KEY) !== 'true') {
                    setTimeout(() => setRun(true), 0);
                }
            }
        }

        const handleStart = () => {
            setStepIndex(0);
            setRun(true);
        };
        window.addEventListener('start-onboarding-tour', handleStart);
        return () => window.removeEventListener('start-onboarding-tour', handleStart);
    }, [user]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, action, index } = data;

        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
            setRun(false);
            updateTourStatus(true);
            // Save to local storage too for immediate effect on reload
            localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            // Auto-open sidebar for privacy step
            if (index === 3 && action === ACTIONS.NEXT) {
                setSidebarOpen(true);
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
                    arrowColor: 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'transparent',
                    overlayColor: 'rgba(0, 0, 0, 0.4)',
                    primaryColor: 'var(--primary-500)',
                    textColor: '#fff',
                    zIndex: 1000,
                },
                tooltip: {
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '1.25rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    padding: '1.5rem',
                    color: '#fff',
                },
                tooltipContainer: {
                    textAlign: 'start',
                },
                tooltipContent: {
                    padding: '1rem 0',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    opacity: 0.9,
                },
                buttonNext: {
                    backgroundColor: 'var(--primary-500)',
                    borderRadius: '0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    padding: '0.6rem 1.2rem',
                },
                buttonBack: {
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginRight: '0.5rem',
                    fontSize: '0.8rem',
                },
                buttonSkip: {
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.8rem',
                },
            }}
            floaterProps={{
                disableAnimation: false,
            }}
        />
    );
};
