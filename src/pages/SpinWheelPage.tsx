import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';

type GamePageProps = {
  onNavigate: (page: string) => void;
};

type Segment = {
  label: 'BLN' | '3%' | '5%' | '10%';
  display: string;
  discount: number;
  weight: number;
};

export default function SpinWheelPage({ onNavigate }: GamePageProps) {
  const { user } = useAuth();
  const { setDiscountPercent } = useCart();
  const [enabled, setEnabled] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<null | { label: Segment['label']; discount: number }>(null);

  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);

  const segments: Segment[] = useMemo(
    () => [
      { label: 'BLN', display: 'Better Luck\nNext Time', discount: 0, weight: 20 },
      { label: '3%', display: '3% Discount', discount: 3, weight: 25 },
      { label: 'BLN', display: 'Better Luck\nNext Time', discount: 0, weight: 20 },
      { label: '5%', display: '5% Discount', discount: 5, weight: 15 },
      { label: 'BLN', display: 'Better Luck\nNext Time', discount: 0, weight: 20 },
      { label: '10%', display: '10% Discount', discount: 10, weight: 10 },
    ],
    []
  );

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from('game_settings')
        .select('spin_wheel_active,is_active')
        .single();
      if (data) setEnabled((data.spin_wheel_active ?? data.is_active) === true);
    };
    check();
  }, []);

  const pickWeightedIndex = () => {
    const total = segments.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < segments.length; i++) {
      r -= segments[i].weight;
      if (r <= 0) return i;
    }
    return segments.length - 1;
  };

  const spin = () => {
    if (!user) {
      onNavigate('auth');
      return;
    }
    if (spinning) return;

    setResult(null);
    setSpinning(true);

    const chosenIndex = pickWeightedIndex();
    const segAngle = 360 / segments.length;
    const centerOfSegment = chosenIndex * segAngle + segAngle / 2;

    // Pointer is at 12 o'clock. We rotate the wheel so chosen segment lands under pointer.
    const targetRotation =
      rotationRef.current +
      360 * (4 + Math.floor(Math.random() * 2)) +
      (360 - centerOfSegment) +
      (Math.random() * 10 - 5);

    rotationRef.current = targetRotation;
    setRotation(targetRotation);

    window.setTimeout(() => {
      const seg = segments[chosenIndex];
      setResult({ label: seg.label, discount: seg.discount });
      if (seg.discount > 0) setDiscountPercent(seg.discount);
      setSpinning(false);
    }, 3200);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-300 mb-4">Please sign in to spin</h2>
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

  if (!enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-24 h-24 text-yellow-900 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-300 mb-4">Spin the Wheel is disabled</h2>
          <p className="text-gray-400">Check back later!</p>
        </div>
      </div>
    );
  }

  const wheelBg = `conic-gradient(
    from -90deg,
    rgba(250,204,21,0.18) 0deg 60deg,
    rgba(255,255,255,0.06) 60deg 120deg,
    rgba(250,204,21,0.18) 120deg 180deg,
    rgba(255,255,255,0.06) 180deg 240deg,
    rgba(250,204,21,0.18) 240deg 300deg,
    rgba(255,255,255,0.06) 300deg 360deg
  )`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-3">Spin the Wheel</h1>
          <p className="text-base md:text-lg text-gray-300">
            Try your luck and win a discount for your next order.
          </p>
        </div>

        <div className="bg-neutral-900/80 rounded-2xl border border-yellow-500/25 shadow-xl p-6 md:p-8">
          <div className="flex flex-col items-center">
            <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px]">
              {/* Pointer */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-yellow-400 drop-shadow-lg" />
              </div>

              {/* Wheel */}
              <div
                className="absolute inset-0 rounded-full border-4 border-yellow-500/40 shadow-[0_0_0_6px_rgba(0,0,0,0.25)] overflow-hidden"
                style={{
                  background: wheelBg,
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 3.2s cubic-bezier(0.12, 0.74, 0.1, 0.99)' : undefined,
                }}
              >
                {/* Labels */}
                {segments.map((seg, i) => {
                  const segAngle = 360 / segments.length;
                  const angle = i * segAngle + segAngle / 2;
                  return (
                    <div
                      key={`${seg.label}-${i}`}
                      className="absolute left-1/2 top-1/2"
                      style={{
                        transform: `rotate(${angle}deg) translateY(-44%)`,
                        transformOrigin: '0 0',
                      }}
                    >
                      <div
                        className={`w-[130px] sm:w-[150px] -translate-x-1/2 text-center select-none ${
                          seg.discount > 0 ? 'text-yellow-200' : 'text-gray-200'
                        }`}
                        style={{ transform: `rotate(${-angle - rotation}deg)` }}
                      >
                        <p className="text-[11px] sm:text-xs font-extrabold leading-tight whitespace-pre-line">
                          {seg.display}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Center cap */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-black/70 border border-yellow-500/35 shadow-lg" />
                </div>
              </div>
            </div>

            <div className="mt-6 w-full max-w-md text-center">
              <button
                onClick={spin}
                disabled={spinning}
                className="w-full bg-yellow-400 text-black py-3 rounded-xl font-extrabold hover:bg-yellow-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {spinning ? 'Spinning…' : 'SPIN'}
              </button>

              {result && (
                <div className="mt-4 rounded-xl border border-yellow-500/25 bg-black/40 p-4">
                  {result.discount === 0 ? (
                    <p className="text-sm font-semibold text-gray-200">
                      <span className="text-yellow-300">Result:</span> Better Luck Next Time
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-200">
                      <span className="text-yellow-300">Congratulations!</span> You won{' '}
                      <span className="text-white font-extrabold">{result.discount}%</span> discount.
                      <span className="block text-[11px] text-gray-400 mt-1">
                        Discount is now applied to your cart.
                      </span>
                    </p>
                  )}
                </div>
              )}

              <p className="mt-4 text-[11px] text-gray-400">
                Wheel order: BLN, 3%, BLN, 5%, BLN, 10%. Winning rates: 3% (25%), 5% (15%), 10% (10%), BLN (60%).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

