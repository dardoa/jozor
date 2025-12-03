import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onSave: (base64Audio: string) => void;
  t: any;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, t }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                
                // Auto save
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    onSave(base64);
                };
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access denied", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {!isRecording ? (
                 <button 
                    onClick={startRecording}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
                 >
                     <Mic className="w-3.5 h-3.5" />
                     {t.recordVoice}
                 </button>
            ) : (
                <button 
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse"
                >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    {t.stopRecording}
                </button>
            )}
        </div>
    );
};