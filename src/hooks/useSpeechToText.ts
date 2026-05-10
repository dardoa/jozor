import { useState, useCallback, useRef } from 'react';

interface UseSpeechToTextOptions {
    onResult?: (text: string) => void;
    onError?: (error: any) => void;
    language?: 'ar-SA' | 'en-US';
}

/**
 * Native Web Speech API hook for voice recognition.
 */
export const useSpeechToText = (options: UseSpeechToTextOptions = {}) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            options.onError?.('Speech recognition not supported in this browser.');
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        const recognition = new SpeechRecognition();
        recognition.lang = options.language || 'ar-SA';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            setIsListening(false);
            options.onError?.(event.error);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            options.onResult?.(transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [options]);

    return {
        isListening,
        startListening,
        stopListening,
        isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    };
};
