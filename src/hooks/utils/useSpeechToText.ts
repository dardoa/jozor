import { useState, useCallback, useRef } from 'react';

interface UseSpeechToTextOptions {
    onResult?: (text: string) => void;
    onError?: (error: string) => void;
    language?: 'ar-SA' | 'en-US';
}

interface SpeechRecognitionErrorEventLike {
    error: string;
}

interface SpeechRecognitionResultEventLike {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
    start: () => void;
    stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | undefined => {
    const speechWindow = window as SpeechRecognitionWindow;
    return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
};

/**
 * Native Web Speech API hook for voice recognition.
 */
export const useSpeechToText = (options: UseSpeechToTextOptions = {}) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = getSpeechRecognitionConstructor();
        
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
        recognition.onerror = (event) => {
            setIsListening(false);
            options.onError?.(event.error);
        };
        recognition.onresult = (event) => {
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
        isSupported: !!getSpeechRecognitionConstructor()
    };
};
