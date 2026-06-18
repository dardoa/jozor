import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

// - Vite worker import
import ConsistencyWorker from '../../services/ConsistencyWorker?worker';

/**
 * Hook to manage the background Consistency Checker worker.
 * Debounces validation to avoid excessive calculations during rapid edits.
 */
export const useConsistency = () => {
    const people = useAppStore((state) => state.people);
    const setValidationErrors = useAppStore((state) => state.setValidationErrors);
    const workerRef = useRef<Worker | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Initialize Worker
        workerRef.current = new ConsistencyWorker();

        if (workerRef.current) {
            workerRef.current.onmessage = (e) => {
                const { type } = e.data as { type?: string };
                if (type === 'success') {
                    const { errors } = e.data as { errors?: Record<string, string[]> };
                    setValidationErrors(errors || {});
                }
                if (type === 'error') {
                    setValidationErrors({});
                }
            };
        }

        // Strict Cleanup: Terminate worker on unmount to prevent ghost processes
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [setValidationErrors]);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (!workerRef.current || Object.keys(people).length === 0) return;

        const checkConsistency = () => {
            timeoutRef.current = null;
            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'CHECK', people });
            }
        };
        timeoutRef.current = setTimeout(checkConsistency, 1000);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [people]);

    return null; // Side-effect only hook
};
