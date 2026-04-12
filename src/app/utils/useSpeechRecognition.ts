import { useState, useCallback, useRef, useEffect } from 'react';
import { getSpeechToken } from './api';

export type SpeechStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'error' | 'unavailable';

type SpeechSdkModule = typeof import('microsoft-cognitiveservices-speech-sdk');
type SpeechRecognizer = import('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer;

let speechSdkPromise: Promise<SpeechSdkModule> | null = null;

async function loadSpeechSdk(): Promise<SpeechSdkModule> {
  if (!speechSdkPromise) {
    speechSdkPromise = import('microsoft-cognitiveservices-speech-sdk');
  }
  return speechSdkPromise;
}

export function useSpeechRecognition() {
  const hasMicApi = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const [status, setStatus] = useState<SpeechStatus>(hasMicApi ? 'idle' : 'unavailable');
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [micAvailable, setMicAvailable] = useState<boolean | null>(hasMicApi ? null : false);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);

  const checkMicrophoneAvailability = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicAvailable(false);
        setStatus('unavailable');
        return false;
      }

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (result.state === 'denied') {
            setMicAvailable(false);
            return false;
          }
        } catch {
          // Some browsers do not support querying microphone permission.
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicAvailable(true);
      return true;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.warn('Microphone not available:', e.message);
      setMicAvailable(false);
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      recognizerRef.current?.close();
      recognizerRef.current = null;
    };
  }, []);

  const startListening = useCallback(async (
    onResult: (text: string) => void,
    language: string = 'en-US'
  ) => {
    setError(null);
    setInterimText('');

    const available = await checkMicrophoneAvailability();
    if (!available) {
      setError('麦克风不可用：当前环境不允许访问麦克风。请在新标签页中打开本应用，或检查浏览器权限设置。');
      setStatus('error');
      return;
    }

    setStatus('connecting');

    try {
      const SpeechSDK = await loadSpeechSdk();
      const { token, region } = await getSpeechToken();

      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = language;

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizerRef.current = recognizer;

      recognizer.recognizing = (_s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
          setInterimText(e.result.text);
        }
      };

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
        recognizer.stopContinuousRecognitionAsync(() => {
          recognizer.close();
          recognizerRef.current = null;
        });
      };

      recognizer.sessionStopped = () => {
        recognizer.close();
        recognizerRef.current = null;
        setStatus('idle');
        setInterimText('');
      };

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
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error('Speech recognition setup error:', e);
      setError(e.message || '语音识别初始化失败');
      setStatus('error');
    }
  }, [checkMicrophoneAvailability]);

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
