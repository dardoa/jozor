import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

interface OnboardingTourProps {
    setDetailsPanelOpen: (open: boolean) => void;
}

const TOUR_STORAGE_KEY = 'jozor_onboarding_completed';
const TOUR_IDLE_TIMEOUT_MS = 2500;

const OnboardingTourRuntime = React.lazy(() =>
    import('./OnboardingTourRuntime').then((module) => ({ default: module.OnboardingTourRuntime }))
);

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ setDetailsPanelOpen }) => {
    const user = useAppStore((state) => state.user);
    const [shouldLoadTour, setShouldLoadTour] = useState(false);
    const [forceStartToken, setForceStartToken] = useState(0);

    useEffect(() => {
        const handleStart = () => {
            setShouldLoadTour(true);
            setForceStartToken((token) => token + 1);
        };

        window.addEventListener('start-onboarding-tour', handleStart);
        return () => window.removeEventListener('start-onboarding-tour', handleStart);
    }, []);

    useEffect(() => {
        const localCompleted = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
        if (localCompleted) return;

        if (user?.metadata && (user.metadata.has_completed_tour === undefined || user.metadata.has_completed_tour === false)) {
            const scheduleTour = window.requestIdleCallback
                ? window.requestIdleCallback(() => setShouldLoadTour(true), { timeout: TOUR_IDLE_TIMEOUT_MS })
                : window.setTimeout(() => setShouldLoadTour(true), TOUR_IDLE_TIMEOUT_MS);

            return () => {
                if (window.cancelIdleCallback && typeof scheduleTour === 'number') {
                    window.cancelIdleCallback(scheduleTour);
                    return;
                }
                window.clearTimeout(scheduleTour);
            };
        }
    }, [user]);

    if (!shouldLoadTour) return null;

    return (
        <React.Suspense fallback={null}>
            <OnboardingTourRuntime forceStartToken={forceStartToken} setDetailsPanelOpen={setDetailsPanelOpen} />
        </React.Suspense>
    );
};
