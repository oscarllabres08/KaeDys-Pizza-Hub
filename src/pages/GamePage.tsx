import { useEffect, useState } from 'react';
import { Pizza, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';

type FallingPizza = {
  id: number;
  x: number;
  y: number;
  points: number;
  speed: number;
};

type GamePageProps = {
  onNavigate: (page: string) => void;
};

export default function GamePage({ onNavigate }: GamePageProps) {
  const { user } = useAuth();
  const { setDiscountPercent } = useCart();
  const [gameActive, setGameActive] = useState(false);
  const [gameEnabled, setGameEnabled] = useState(true);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [pizzas, setPizzas] = useState<FallingPizza[]>([]);
  const [canPlay, setCanPlay] = useState(true);
  const [lastPlayed, setLastPlayed] = useState<Date | null>(null);

  useEffect(() => {
    checkGameSettings();
    if (user) {
      checkLastPlayed();
    }
  }, [user]);

  useEffect(() => {
    if (gameActive) {
      const gameInterval = setInterval(() => {
        setPizzas((prev) =>
          prev
            .map((pizza) => ({
              ...pizza,
              y: pizza.y + pizza.speed,
            }))
            .filter((pizza) => pizza.y < window.innerHeight)
        );

        if (Math.random() < 0.3) {
          addPizza();
        }
      }, 100);

      const timerInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(gameInterval);
        clearInterval(timerInterval);
      };
    }
  }, [gameActive]);

  const checkGameSettings = async () => {
    const { data } = await supabase
      .from('game_settings')
      .select('is_active')
      .single();

    if (data) {
      setGameEnabled(data.is_active);
    }
  };

  const checkLastPlayed = async () => {
    if (!user) return;

    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('game_plays')
      .select('played_at')
      .eq('user_id', user.id)
      .gte('played_at', sunday.toISOString())
      .order('played_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCanPlay(false);
      setLastPlayed(new Date(data.played_at));
    } else {
      setCanPlay(true);
    }
  };

  const addPizza = () => {
    const points = [1, 2, 3, 5][Math.floor(Math.random() * 4)];
    setPizzas((prev) => [
      ...prev,
      {
        id: Date.now(),
        x: Math.random() * (window.innerWidth - 80),
        y: -80,
        points,
        speed: 3 + Math.random() * 3,
      },
    ]);
  };

  const handlePizzaClick = (id: number, points: number) => {
    setScore((prev) => prev + points);
    setPizzas((prev) => prev.filter((pizza) => pizza.id !== id));
  };

  const startGame = () => {
    if (!user) {
      onNavigate('auth');
      return;
    }

    const today = new Date();
    if (today.getDay() !== 0) {
      alert('The discount game is only available on Sundays.');
      return;
    }

    if (!canPlay) {
      alert('You can only play once per week on Sunday!');
      return;
    }

    setGameActive(true);
    setScore(0);
    setTimeLeft(10);
    setPizzas([]);
  };

  const endGame = async () => {
    setGameActive(false);
    setPizzas([]);

    if (!user) return;

    const discountPercentage = Math.min(score, 10);

    try {
      const { error } = await supabase.from('game_plays').insert([
        {
          user_id: user.id,
          score,
          discount_earned: discountPercentage,
          claimed: false,
        }]);

      if (error) throw error;

      if (discountPercentage > 0) {
        alert(
          `Congratulations! You earned ${discountPercentage}% discount! The discount will be calculated when you place your order.`
        );
        setCanPlay(false);
      }
    } catch (error) {
      console.error('Error saving game:', error);
    }
  };

  const claimDiscount = async () => {
    if (!user) return;

    try {
      const { data: gamePlay } = await supabase
        .from('game_plays')
        .select('*')
        .eq('user_id', user.id)
        .eq('claimed', false)
        .order('played_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gamePlay) {
        const { error: updateError } = await supabase
          .from('game_plays')
          .update({ claimed: true })
          .eq('id', gamePlay.id);

        if (updateError) throw updateError;

        setDiscountPercent(gamePlay.discount_earned);
        alert(`${gamePlay.discount_earned}% discount applied to your cart! The discount will be shown in your order summary.`);
        onNavigate('menu');
      }
    } catch (error) {
      console.error('Error claiming discount:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Pizza className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-300 mb-4">
            Please sign in to play the game
          </h2>
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
          <Pizza className="w-24 h-24 text-yellow-900 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-300 mb-4">
            Game is currently disabled
          </h2>
          <p className="text-gray-400">Check back later!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-4">
            Falling Pizza Game
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Tap the falling pizzas to earn points and win discounts!
          </p>
          <p className="text-sm text-yellow-400 font-semibold">
            Play once per week on Sunday • Maximum 10% discount
          </p>
        </div>

        {!gameActive && (
          <div className="bg-neutral-900 rounded-xl shadow-lg p-8 text-center border border-yellow-500/30">
            <div className="bg-yellow-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-300 mb-4">How to Play</h2>
            <div className="text-left max-w-md mx-auto mb-8 space-y-2">
              <p className="text-gray-300">• Tap falling pizzas to earn points</p>
              <p className="text-gray-300">• Each pizza has different point values (1-5)</p>
              <p className="text-gray-300">• You have 10 seconds to score</p>
              <p className="text-gray-300">• Your score equals discount percentage</p>
              <p className="text-gray-300">• Maximum 10% discount per game</p>
            </div>

            {canPlay ? (
              <button
                onClick={startGame}
                className="bg-yellow-400 text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
              >
                Start Game
              </button>
            ) : (
              <div>
                <p className="text-red-400 font-semibold mb-4">
                  You've already played this week!
                </p>
                {lastPlayed && (
                  <p className="text-gray-400 text-sm mb-4">
                    Last played: {lastPlayed.toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={claimDiscount}
                  className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 transition-all"
                >
                  Claim Your Discount
                </button>
              </div>
            )}
          </div>
        )}

        {gameActive && (
          <div className="relative">
            <div className="bg-neutral-900 rounded-xl shadow-lg p-4 mb-4 flex justify-between items-center border border-yellow-500/30">
              <div className="text-2xl font-bold text-yellow-300">
                Score: {score}
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                Time: {timeLeft}s
              </div>
            </div>

            <div
              className="relative bg-gradient-to-b from-neutral-900 to-black rounded-xl shadow-lg overflow-hidden border border-yellow-500/30"
              style={{ height: '500px' }}
            >
              {pizzas.map((pizza) => (
                <button
                  key={pizza.id}
                  onClick={() => handlePizzaClick(pizza.id, pizza.points)}
                  className="absolute transition-none animate-pulse"
                  style={{
                    left: `${pizza.x}px`,
                    top: `${pizza.y}px`,
                  }}
                >
                  <div className="relative">
                    <Pizza className="w-16 h-16 text-yellow-400" fill="currentColor" />
                    <span className="absolute inset-0 flex items-center justify-center text-black font-bold text-xl">
                      {pizza.points}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
