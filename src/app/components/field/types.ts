export type FieldState = 'answering' | 'stuck' | 'evaluating' | 'done';

export interface FieldEvaluationResult {
  score: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  feedback: string[];
  verbsUsed: string[];
}

export interface FieldQuestion {
  id: string;
  part: number;
  topic: string;
  question: string;
}

export interface FieldSpeechState {
  status: 'idle' | 'connecting' | 'listening' | 'processing' | 'error' | 'unavailable';
  isListening: boolean;
  interimText: string;
  error: string | null;
  micAvailable: boolean | null;
}
