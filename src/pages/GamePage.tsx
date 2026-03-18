import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, RotateCcw, Timer, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type GamePageProps = {
  onNavigate: (page: string) => void;
};

type Difficulty = 'easy' | 'medium';
type Phase = 'start' | 'ready' | 'playing' | 'ended';
type EndReason = 'time' | 'wrong';

type Question = {
  a: number;
  b: number;
  correct: number;
};

const GAME_SECONDS = 30;

function createChainedAudio(srcCandidates: string[]) {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = 0.9;

  let idx = 0;
  const tryNext = () => {
    idx += 1;
    if (idx >= srcCandidates.length) return;
    audio.src = srcCandidates[idx];
    audio.load();
  };

  audio.addEventListener('error', tryNext);
  audio.src = srcCandidates[0] ?? '';
  return audio;
}

async function playSound(audio: HTMLAudioElement | null) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    await audio.play();
  } catch {
    // ignore (autoplay restrictions, missing file, etc.)
  }
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuestion(difficulty: Difficulty): Question {
  const b = 1 + Math.floor(Math.random() * 9);
  const a =
    difficulty === 'easy'
      ? 1 + Math.floor(Math.random() * 9)
      : 10 + Math.floor(Math.random() * 90);
  return { a, b, correct: a * b };
}

function makeChoices(correct: number): number[] {
  const choices = new Set<number>([correct]);
  const baseSpread = Math.max(3, Math.round(Math.sqrt(correct)));

  while (choices.size < 4) {
    const delta = (Math.floor(Math.random() * (baseSpread * 2 + 1)) - baseSpread) || 1;
    const candidate = correct + delta;
    if (candidate > 0) choices.add(candidate);
  }
  return shuffle(Array.from(choices));
}

export default function GamePage({ onNavigate }: GamePageProps) {
  const { user } = useAuth();
  const [gameEnabled, setGameEnabled] = useState(true);
  const [phase, setPhase] = useState<Phase>('start');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [endReason, setEndReason] = useState<EndReason>('time');
  const [question, setQuestion] = useState<Question>(() => makeQuestion('easy'));
  const [choices, setChoices] = useState<number[]>(() => makeChoices(question.correct));
  const [locked, setLocked] = useState(false);
  const [lastPick, setLastPick] = useState<null | { value: number; correct: boolean }>(null);
  const tickRef = useRef<number | null>(null);
  const gameOverSoundPlayedRef = useRef(false);
  const prevTimeLeftRef = useRef<number>(GAME_SECONDS);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameOverAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameStartAudioRef = useRef<HTMLAudioElement | null>(null);
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const timePct = useMemo(() => (timeLeft / GAME_SECONDS) * 100, [timeLeft]);

  const accentChoices = useMemo(
    () => [
      'from-sky-500/25 to-sky-500/5 border-sky-400/25 hover:border-sky-300/40',
      'from-fuchsia-500/25 to-fuchsia-500/5 border-fuchsia-400/25 hover:border-fuchsia-300/40',
      'from-emerald-500/25 to-emerald-500/5 border-emerald-400/25 hover:border-emerald-300/40',
      'from-amber-500/25 to-amber-500/5 border-amber-400/25 hover:border-amber-300/40',
    ],
    []
  );

  useEffect(() => {
    // Sounds are loaded from `/public/sounds/*` (served as `/sounds/*`).
    // Put your files in `public/sounds/` and name them like:
    // - correct.(mp3|wav|ogg)
    // - game_over.(mp3|wav|ogg)
    // - game_start.(mp3|wav|ogg)  (also used as countdown tick)
    if (!correctAudioRef.current) {
      correctAudioRef.current = createChainedAudio([
        '/sounds/correct.wav',
        '/sounds/correct.mp3',
        '/sounds/correct.ogg',
      ]);
    }
    if (!gameOverAudioRef.current) {
      gameOverAudioRef.current = createChainedAudio([
        '/sounds/game_over.wav',
        '/sounds/game_over.mp3',
        '/sounds/game_over.ogg',
      ]);
    }
    if (!gameStartAudioRef.current) {
      gameStartAudioRef.current = createChainedAudio([
        '/sounds/game_start.wav',
        '/sounds/game_start.mp3',
        '/sounds/game_start.ogg',
      ]);
      gameStartAudioRef.current.volume = 0.75;
    }
    if (!tickAudioRef.current) {
      tickAudioRef.current = createChainedAudio([
        '/sounds/game_start.wav',
        '/sounds/game_start.mp3',
        '/sounds/game_start.ogg',
      ]);
      tickAudioRef.current.volume = 0.5;
    }

    return () => {
      correctAudioRef.current?.pause();
      gameOverAudioRef.current?.pause();
      gameStartAudioRef.current?.pause();
      tickAudioRef.current?.pause();
      correctAudioRef.current = null;
      gameOverAudioRef.current = null;
      gameStartAudioRef.current = null;
      tickAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    checkGameSettings();
  }, [user]);

  useEffect(() => {
    if (phase !== 'playing') return;

    tickRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft !== 0) return;
    setLocked(true);
    setEndReason('time');
    setPhase('ended');
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase !== 'ended') return;
    if (gameOverSoundPlayedRef.current) return;
    gameOverSoundPlayedRef.current = true;
    playSound(gameOverAudioRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, endReason]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const prev = prevTimeLeftRef.current;
    prevTimeLeftRef.current = timeLeft;

    // Countdown tick each second (only when time decreases, not on initial set)
    if (timeLeft > 0 && prev > timeLeft) {
      playSound(tickAudioRef.current);
    }
  }, [phase, timeLeft]);

  const difficultyPoints = useMemo(() => (difficulty === 'easy' ? 1 : 2), [difficulty]);

  const checkGameSettings = async () => {
    const { data } = await supabase
      .from('game_settings')
      .select('falling_pizza_active,is_active')
      .single();

    if (data) {
      setGameEnabled((data.falling_pizza_active ?? data.is_active) === true);
    }
  };

  const chooseDifficulty = (d: Difficulty) => {
    if (!user) {
      onNavigate('auth');
      return;
    }
    setDifficulty(d);
    setPhase('ready');
    setLocked(false);
    setLastPick(null);
  };

  const startGame = () => {
    if (!user) {
      onNavigate('auth');
      return;
    }
    playSound(gameStartAudioRef.current);
    setPhase('playing');
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(GAME_SECONDS);
    setLocked(false);
    setLastPick(null);
    setEndReason('time');
    gameOverSoundPlayedRef.current = false;
    prevTimeLeftRef.current = GAME_SECONDS;
    const q = makeQuestion(difficulty);
    setQuestion(q);
    setChoices(makeChoices(q.correct));
  };

  const nextQuestion = () => {
    const q = makeQuestion(difficulty);
    setQuestion(q);
    setChoices(makeChoices(q.correct));
  };

  const handlePick = (value: number) => {
    if (locked || phase !== 'playing') return;
    const isCorrect = value === question.correct;
    setLocked(true);
    setLastPick({ value, correct: isCorrect });

    if (isCorrect) {
      playSound(correctAudioRef.current);
      setCorrectCount((c) => c + 1);
      setScore((s) => s + (difficulty === 'easy' ? 1 : 2));
      window.setTimeout(() => {
        if (timeLeft === 0) {
          setEndReason('time');
          setPhase('ended');
          return;
        }
        nextQuestion();
        setLastPick(null);
        setLocked(false);
      }, 220);
    } else {
      // Incorrect answer ends the game.
      window.setTimeout(() => {
        setEndReason('wrong');
        setPhase('ended');
      }, 320);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Calculator className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-300 mb-4">Please sign in to play</h2>
          <button
            onClick={() => onNavigate('auth')}
            className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!gameEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Calculator className="w-24 h-24 text-yellow-900 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-300 mb-4">
            Game is currently disabled
          </h2>
          <p className="text-gray-400">Check back later!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-950 to-neutral-900 py-10 px-4">
      <div className="relative max-w-xl mx-auto">
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
        `}</style>

        <div className="text-center mb-6 animate-fadeIn">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-black/40 px-4 py-2 mb-4">
            <Calculator className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-extrabold tracking-wide text-yellow-200">
              MULTIPLICATION CHALLENGE
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-yellow-300 mb-2 tracking-tight">
            Math Challenge
          </h1>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Answer as many multiplication questions as you can in{' '}
            <span className="text-yellow-200 font-bold">{GAME_SECONDS}</span> seconds.
          </p>
        </div>

        <div className="bg-neutral-900/70 backdrop-blur rounded-3xl border border-yellow-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.55)] p-6 md:p-8">
          {phase === 'start' && (
            <div className="text-center">
              <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/25 flex items-center justify-center shadow-inner">
                <Calculator className="w-10 h-10 text-yellow-300" />
              </div>
              <h2 className="text-2xl font-black text-yellow-300 mb-2 tracking-tight">
                Choose difficulty
              </h2>
              <p className="text-sm text-gray-300 mb-7 leading-relaxed">
                Easy: 1-digit × 1-digit (+1). Medium: 2-digit × 1-digit (+2).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => chooseDifficulty('easy')}
                  className="group rounded-2xl border border-yellow-500/20 bg-gradient-to-b from-black/40 to-black/25 px-5 py-5 text-left hover:border-yellow-400/35 hover:from-black/50 hover:to-black/30 transition-all active:scale-[0.99] shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-yellow-300 font-black text-lg">Easy</p>
                    <span className="text-[11px] font-extrabold text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-full px-2 py-0.5">
                      +1 / correct
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mt-2">1-digit × 1-digit</p>
                  <p className="text-gray-400 text-xs mt-1">Example: 3 × 9</p>
                </button>
                <button
                  onClick={() => chooseDifficulty('medium')}
                  className="group rounded-2xl border border-yellow-500/20 bg-gradient-to-b from-black/40 to-black/25 px-5 py-5 text-left hover:border-yellow-400/35 hover:from-black/50 hover:to-black/30 transition-all active:scale-[0.99] shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-yellow-300 font-black text-lg">Medium</p>
                    <span className="text-[11px] font-extrabold text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-full px-2 py-0.5">
                      +2 / correct
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mt-2">2-digit × 1-digit</p>
                  <p className="text-gray-400 text-xs mt-1">Example: 12 × 4</p>
                </button>
              </div>
            </div>
          )}

          {phase === 'ready' && (
            <div className="text-center">
              <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/25 flex items-center justify-center shadow-inner">
                <Timer className="w-10 h-10 text-yellow-300" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-yellow-300 mb-2 tracking-tight">
                Get ready!
              </h2>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Difficulty{' '}
                <span className="text-yellow-200 font-extrabold">{difficulty.toUpperCase()}</span>
                . You have{' '}
                <span className="text-yellow-200 font-extrabold">{GAME_SECONDS}s</span>.
              </p>

              <div className="rounded-2xl border border-yellow-500/20 bg-black/35 p-5 text-left max-w-md mx-auto">
                <p className="text-gray-200 font-extrabold mb-3">How it works</p>
                <div className="grid gap-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-yellow-400/80 shrink-0" />
                    <span>Multiplication only</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-yellow-400/80 shrink-0" />
                    <span>4 multiple-choice answers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-yellow-400/80 shrink-0" />
                    <span>Correct = next question instantly</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-yellow-400/80 shrink-0" />
                    <span>
                      Score: Easy <span className="text-yellow-200 font-bold">+1</span>, Medium{' '}
                      <span className="text-yellow-200 font-bold">+2</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
                <button
                  onClick={startGame}
                  className="rounded-2xl bg-yellow-400 text-black px-5 py-3.5 font-black hover:bg-yellow-300 transition-all active:scale-[0.99] shadow-lg shadow-yellow-500/10"
                >
                  Start Game
                </button>
                <button
                  onClick={() => setPhase('start')}
                  className="rounded-2xl border border-yellow-500/25 bg-black/40 px-5 py-3.5 font-black text-yellow-200 hover:bg-black/55 transition-all active:scale-[0.99]"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {phase === 'playing' && (
            <div>
              {/* Timer progress */}
              <div className="mb-5">
                <div className="h-2 rounded-full bg-black/35 border border-yellow-500/15 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-400 transition-[width] duration-500"
                    style={{ width: `${timePct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2 rounded-full border border-yellow-500/20 bg-black/40 px-3.5 py-2.5">
                  <Timer className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-black text-yellow-200 tabular-nums">
                    {timeLeft}s
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-yellow-500/20 bg-black/40 px-3.5 py-2.5">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-black text-yellow-200 tabular-nums">
                    {score} pts
                  </span>
                </div>
              </div>

              <div
                className={`rounded-3xl border border-yellow-500/20 bg-gradient-to-b from-black/40 to-black/25 p-6 text-center shadow-sm ${
                  lastPick && !lastPick.correct ? 'animate-[shake_300ms_ease-in-out_1]' : ''
                }`}
              >
                <p className="text-gray-300 text-xs sm:text-sm mb-3">
                  Difficulty{' '}
                  <span className="text-yellow-300 font-black">{difficulty.toUpperCase()}</span>
                  <span className="text-gray-500"> · </span>
                  <span className="text-gray-300">
                    +<span className="text-yellow-200 font-black">{difficultyPoints}</span> per correct
                  </span>
                </p>
                <p className="text-4xl md:text-6xl font-black text-white tracking-tight">
                  {question.a}{' '}
                  <span className="text-yellow-300">×</span>{' '}
                  {question.b}{' '}
                  <span className="text-gray-400">= ?</span>
                </p>

                {lastPick && (
                  <p
                    className={`mt-4 text-sm font-extrabold ${
                      lastPick.correct ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {lastPick.correct ? 'Correct!' : 'Try again'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                {choices.map((c, idx) => {
                  const picked = lastPick?.value === c;
                  const isCorrect = c === question.correct;
                  const baseAccent = accentChoices[idx % accentChoices.length];
                  const stateClass =
                    picked && lastPick
                      ? lastPick.correct
                        ? 'border-green-400/60 bg-green-500/15'
                        : 'border-red-400/60 bg-red-500/10'
                      : `bg-gradient-to-b ${baseAccent} hover:from-white/10 hover:to-white/5`;

                  return (
                    <button
                      key={c}
                      onClick={() => handlePick(c)}
                      disabled={locked}
                      className={`rounded-2xl border px-4 py-4 md:py-5 text-2xl md:text-4xl font-black text-white transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm ${stateClass}`}
                      aria-label={`Answer ${c}${picked ? (isCorrect ? ', correct' : ', wrong') : ''}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {phase === 'ended' && (
            <div className="text-center">
              <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/25 flex items-center justify-center shadow-inner">
                <Trophy className="w-10 h-10 text-yellow-300" />
              </div>
              <h2
                className={`text-2xl md:text-3xl font-black mb-2 tracking-tight ${
                  endReason === 'wrong' ? 'text-red-300' : 'text-yellow-300'
                }`}
              >
                {endReason === 'wrong' ? 'Game Over!' : 'Time’s up!'}
              </h2>
              {endReason === 'wrong' ? (
                <p className="text-sm text-gray-300 mb-2">
                  Wrong answer ends the game. Try again!
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3 max-w-md mx-auto">
                <div className="rounded-2xl border border-yellow-500/20 bg-black/35 p-4">
                  <p className="text-xs text-gray-400 font-bold">FINAL SCORE</p>
                  <p className="text-3xl font-black text-white tabular-nums mt-1">{score}</p>
                </div>
                <div className="rounded-2xl border border-yellow-500/20 bg-black/35 p-4">
                  <p className="text-xs text-gray-400 font-bold">CORRECT</p>
                  <p className="text-3xl font-black text-white tabular-nums mt-1">{correctCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
                <button
                  onClick={() => {
                    setPhase('ready');
                  }}
                  className="rounded-2xl bg-yellow-400 text-black px-5 py-3.5 font-black hover:bg-yellow-300 transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart
                </button>
                <button
                  onClick={() => setPhase('start')}
                  className="rounded-2xl border border-yellow-500/25 bg-black/40 px-5 py-3.5 font-black text-yellow-200 hover:bg-black/55 transition-all active:scale-[0.99]"
                >
                  Change difficulty
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
