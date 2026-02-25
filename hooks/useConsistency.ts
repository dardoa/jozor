import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
// @ts-expect-error - consistency logic needs access to internal state
// - Vite worker import
import ConsistencyWorker from '../services/ConsistencyWorker?worker';

/**
 * Hook to manage the background Consistency Checker worker.
 * Debounces validation to avoid excessive calculations during rapid edits.
 */
export const useConsistency = () => {
    const people = useAppStore((state) => state.people);
    const setValidationErrors = useAppStore((state) => state.setValidationErrors);
    const workerRef = useRef<Worker | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Initialize Worker
        workerRef.current = new ConsistencyWorker();

        if (workerRef.current) {
            workerRef.current.onmessage = (e) => {
                const { type, issues } = e.data;
                if (type === 'ISSUES') {
                    setValidationErrors(issues);
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
        if (!workerRef.current || Object.keys(people).length === 0) return;

        // Debounce validation (1000ms delay)
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const checkConsistency = () => {
            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'CHECK', people });
            }
        };
        timeoutRef.current = setTimeout(checkConsistency, 1000);

    }, [people]);

    return null; // Side-effect only hook
};
