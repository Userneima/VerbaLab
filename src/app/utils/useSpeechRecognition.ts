import { useState, useCallback, useRef, useEffect } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { getSpeechToken } from './api';

export type SpeechStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'error' | 'unavailable';

export function useSpeechRecognition() {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);

  // Check microphone availability on mount
  useEffect(() => {
    checkMicrophoneAvailability();
  }, []);

  const checkMicrophoneAvailability = async (): Promise<boolean> => {
    try {
      // Check if getUserMedia API exists
      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicAvailable(false);
        setStatus('unavailable');
        return false;
      }

      // Check permission state if the API is available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (result.state === 'denied') {
            setMicAvailable(false);
            setStatus('unavailable');
            return false;
          }
        } catch {
          // permissions.query may not support 'microphone' in all browsers — continue
        }
      }

      // Try to actually acquire the mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the stream immediately
      stream.getTracks().forEach(t => t.stop());
      setMicAvailable(true);
      return true;
    } catch (err: any) {
      console.warn('Microphone not available:', err.name, err.message);
      setMicAvailable(false);
      setStatus('unavailable');
      return false;
    }
  };

  const startListening = useCallback(async (
    onResult: (text: string) => void,
    language: string = 'en-US'
  ) => {
    setError(null);
    setInterimText('');

    // Re-check mic availability before each attempt
    const available = await checkMicrophoneAvailability();
    if (!available) {
      setError('麦克风不可用：当前环境不允许访问麦克风。请在新标签页中打开本应用，或检查浏览器权限设置。');
      setStatus('error');
      return;
    }

    setStatus('connecting');

    try {
      // Get token from backend
      const { token, region } = await getSpeechToken();

      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = language;

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizerRef.current = recognizer;

      // Interim results (partial recognition)
      recognizer.recognizing = (_s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
          setInterimText(e.result.text);
        }
      };

      // Final results
      recognizer.recognized = (_s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const text = e.result.text;
          if (text) {
            onResult(text);
            setInterimText('');
          }
        } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
          console.log('Speech not recognized');
        }
      };

      recognizer.canceled = (_s, e) => {
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          console.error(`Speech recognition error: ${e.errorCode} - ${e.errorDetails}`);
          setError(`语音识别出错: ${e.errorDetails}`);
          setStatus('error');
        }
        recognizer.stopContinuousRecognitionAsync();
      };

      recognizer.sessionStopped = () => {
        recognizer.stopContinuousRecognitionAsync();
        setStatus('idle');
        setInterimText('');
      };

      // Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => {
          setStatus('listening');
        },
        (err) => {
          console.error('Failed to start speech recognition:', err);
          setError('无法启动语音识别，请检查麦克风权限');
          setStatus('error');
        }
      );
    } catch (err: any) {
      console.error('Speech recognition setup error:', err);
      setError(err.message || '语音识别初始化失败');
      setStatus('error');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          setStatus('idle');
          setInterimText('');
          recognizerRef.current?.close();
          recognizerRef.current = null;
        },
        (err) => {
          console.error('Failed to stop recognition:', err);
          setStatus('idle');
        }
      );
    } else {
      setStatus('idle');
    }
  }, []);

  return {
    status,
    error,
    interimText,
    startListening,
    stopListening,
    isListening: status === 'listening',
    micAvailable,
  };
}
