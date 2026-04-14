"use client";

import { useEffect, useRef, useState } from "react";

type VoiceRecorderProps = {
  disabled?: boolean;
  value: File | null;
  onChange: (file: File | null) => void;
};

export function VoiceRecorder({ disabled, value, onChange }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Tap to record a quick update");
  const [audioUrl, setAudioUrl] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!value) {
      setAudioUrl("");
      return;
    }

    const url = URL.createObjectURL(value);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    if (disabled || isRecording) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-check-in-${Date.now()}.webm`, { type: "audio/webm" });
        onChange(file);
        setStatus("Voice note captured and ready to parse");
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus("Recording... say what you ate, used, and noticed");
    } catch {
      setStatus("Mic access is blocked. You can still upload a file or type your update.");
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || !isRecording) {
      return;
    }

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  return (
    <div className="voice-card">
      <div>
        <p className="capture-subtitle">Voice note</p>
        <p className="capture-helper">{status}</p>
      </div>
      <div className="voice-actions">
        {!isRecording ? (
          <button className="secondary-button" type="button" onClick={startRecording} disabled={disabled}>
            Start recording
          </button>
        ) : (
          <button className="primary-button" type="button" onClick={stopRecording}>
            Stop and use this note
          </button>
        )}
        {value ? (
          <button className="ghost-button" type="button" onClick={() => onChange(null)}>
            Clear note
          </button>
        ) : null}
      </div>
      {audioUrl ? <audio className="audio-player" controls src={audioUrl} /> : null}
    </div>
  );
}
