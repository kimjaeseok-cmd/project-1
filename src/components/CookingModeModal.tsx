import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import type { Recipe } from '../types/recipe';
import { formatCountdown, playTimerChime } from '../utils/audioAndImage';

interface CookingModeModalProps {
  recipe: Recipe;
  initialStepIndex?: number;
  onClose: () => void;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResult>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function CookingModeModal({
  recipe,
  initialStepIndex = 0,
  onClose,
}: CookingModeModalProps) {
  const [stepIdx, setStepIdx] = useState(initialStepIndex);
  const currentStep = recipe.steps[stepIdx] ?? recipe.steps[0];

  // Wake lock state
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  // Step timer inside Cooking Mode
  const [remainingSec, setRemainingSec] = useState<number>(currentStep?.timerSeconds ?? 0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);

  // Voice control (Web Speech API)
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [lastVoiceText, setLastVoiceText] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceListeningRef = useRef(false);

  // Reset timer whenever step changes
  useEffect(() => {
    setTimerRunning(false);
    setTimerDone(false);
    setRemainingSec(currentStep?.timerSeconds ?? 0);
  }, [stepIdx, currentStep?.timerSeconds]);

  // Countdown tick
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setTimerRunning(false);
          setTimerDone(true);
          playTimerChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  // Screen Wake Lock API
  useEffect(() => {
    let active = true;
    const requestLock = async () => {
      try {
        const nav = navigator as unknown as {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock) {
          const sentinel = await nav.wakeLock.request('screen');
          if (active) {
            wakeLockRef.current = sentinel;
            setWakeLockActive(true);
          } else {
            sentinel.release().catch(() => {});
          }
        }
      } catch {
        setWakeLockActive(false);
      }
    };
    requestLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  // Web Speech API setup
  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechCtor));

    return () => {
      voiceListeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleVoice = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechCtor) return;

    if (voiceListening) {
      voiceListeningRef.current = false;
      setVoiceListening(false);
      recognitionRef.current?.stop();
      return;
    }

    try {
      const rec = new SpeechCtor();
      rec.lang = 'ko-KR';
      rec.continuous = true;
      rec.interimResults = false;

      rec.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        if (!last || !last.isFinal) return;
        const transcript = last[0].transcript.trim();
        setLastVoiceText(transcript);

        if (transcript.includes('다음') || transcript.includes('넘겨') || transcript.includes('넥스트')) {
          setStepIdx((prev) => Math.min(recipe.steps.length - 1, prev + 1));
        } else if (transcript.includes('이전') || transcript.includes('뒤로')) {
          setStepIdx((prev) => Math.max(0, prev - 1));
        } else if (transcript.includes('타이머') || transcript.includes('시작')) {
          if ((currentStep?.timerSeconds ?? 0) > 0) {
            setTimerDone(false);
            setTimerRunning(true);
          }
        } else if (transcript.includes('멈춰') || transcript.includes('정지')) {
          setTimerRunning(false);
        }
      };

      rec.onerror = () => {
        voiceListeningRef.current = false;
        setVoiceListening(false);
      };

      rec.onend = () => {
        if (voiceListeningRef.current) {
          try {
            rec.start();
          } catch {
            voiceListeningRef.current = false;
            setVoiceListening(false);
          }
        }
      };

      recognitionRef.current = rec;
      voiceListeningRef.current = true;
      setVoiceListening(true);
      rec.start();
    } catch {
      voiceListeningRef.current = false;
      setVoiceListening(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStepIdx((prev) => Math.min(recipe.steps.length - 1, prev + 1));
      if (e.key === 'ArrowLeft') setStepIdx((prev) => Math.max(0, prev - 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, recipe.steps.length]);

  if (!currentStep) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950 text-zinc-50 flex flex-col justify-between p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="요리 모드"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 max-w-4xl w-full mx-auto">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-zinc-400 truncate">
            {recipe.emoji} {recipe.title} · 단계 {stepIdx + 1} / {recipe.steps.length}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-emerald-400">
            <span className="inline-flex items-center gap-1">
              <Sun className="w-3.5 h-3.5" />
              {wakeLockActive ? '화면 꺼짐 방지 켜짐' : '화면 밝기 유지 권장'}
            </span>
            {lastVoiceText && (
              <span className="text-zinc-400 truncate max-w-[180px]">인식: “{lastVoiceText}”</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              className={`inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                voiceListening
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }`}
              title='음성으로 "다음", "이전", "타이머"라고 말해보세요'
            >
              {voiceListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{voiceListening ? '음성 제어 중' : '음성 제어'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="요리 모드 닫기"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Step Card */}
      <div className="max-w-4xl w-full mx-auto my-auto py-6 space-y-6">
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-transform duration-200 origin-left"
            style={{
              transform: `scaleX(${(stepIdx + 1) / Math.max(1, recipe.steps.length)})`,
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base sm:text-lg text-emerald-400 font-semibold">
            <span>STEP {stepIdx + 1}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="w-5 h-5" />
              {currentStep.heatLevel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">약 {currentStep.durationMinutes}분</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-snug">
            {currentStep.title}
          </h2>

          <p className="text-xl sm:text-3xl leading-relaxed text-zinc-100 font-medium">
            {currentStep.instruction}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
            <p className="text-xs font-semibold text-emerald-400">완성 확인 포인트</p>
            <p className="text-base sm:text-lg text-zinc-200">{currentStep.visualCue}</p>
          </div>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
            <p className="text-xs font-semibold text-amber-400">실패 방지 팁</p>
            <p className="text-base sm:text-lg text-zinc-200">{currentStep.failTip}</p>
          </div>
        </div>

        {/* Integrated Step Timer */}
        {currentStep.timerSeconds > 0 && (
          <div
            className={`rounded-2xl border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 ${
              timerDone
                ? 'bg-emerald-950/60 border-emerald-500'
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Timer className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">
                  {timerDone ? '타이머가 완료되었습니다!' : '단계 타이머'}
                </p>
                <p className="text-3xl sm:text-4xl font-bold font-mono-num text-white">
                  {formatCountdown(remainingSec)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (remainingSec === 0) {
                    setRemainingSec(currentStep.timerSeconds);
                  }
                  setTimerDone(false);
                  setTimerRunning((r) => !r);
                }}
                className="inline-flex items-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base transition-colors cursor-pointer"
              >
                {timerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {timerRunning ? '일시정지' : remainingSec === 0 ? '다시 시작' : '타이머 시작'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerDone(false);
                  setRemainingSec(currentStep.timerSeconds);
                }}
                aria-label="타이머 초기화"
                className="min-h-[48px] min-w-[48px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {voiceSupported && (
          <p className="text-xs text-zinc-400 text-center">
            음성 제어를 켜고 “다음”, “이전”, “타이머”, “멈춰”라고 말해보세요.
          </p>
        )}
      </div>

      {/* Bottom Giant Touch Navigation */}
      <div className="max-w-4xl w-full mx-auto grid grid-cols-2 gap-3 pb-safe">
        <button
          type="button"
          onClick={() => setStepIdx((prev) => Math.max(0, prev - 1))}
          disabled={stepIdx === 0}
          className="min-h-[56px] rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
          이전 단계
        </button>

        {stepIdx < recipe.steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStepIdx((prev) => Math.min(recipe.steps.length - 1, prev + 1))}
            className="min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            다음 단계
            <ChevronRight className="w-6 h-6" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            요리 끝내기
          </button>
        )}
      </div>
    </div>
  );
}
