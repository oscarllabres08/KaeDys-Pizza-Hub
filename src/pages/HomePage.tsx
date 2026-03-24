import { useEffect, useState } from 'react';
import { Pizza, Clock, Heart, Megaphone } from 'lucide-react';
import { supabase, Announcement } from '../lib/supabase';

type HomePageProps = {
  onNavigate: (page: string) => void;
};

export default function HomePage({ onNavigate }: HomePageProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) setAnnouncements(data);
  };

  const activeAnnouncements = announcements.filter((announcement) => announcement.active);
  const latestPromo = activeAnnouncements[0];
  const promoText = latestPromo
    ? `PROMO: ${latestPromo.title} - ${latestPromo.content}`
    : 'PROMO: No active promo right now.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900">
      <div className="relative h-[90vh] flex items-end justify-center bg-black pb-10">
        <img
          src="./store.jpg"
          alt="KaeDy's Pizza Hub Store"
          className="absolute inset-0 w-full h-full object-cover opacity-100  "
        />
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        <div className="absolute top-4 left-0 right-0 z-10 px-3 md:px-6">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-md border border-yellow-400/40 bg-black/75 backdrop-blur-sm">
            <div className="marquee-track text-yellow-300 text-xs md:text-sm font-semibold py-2 whitespace-nowrap">
              <span className="pl-6 pr-24 md:pr-40">{promoText}</span>
              <span className="pl-6 pr-24 md:pr-40" aria-hidden="true">
                {promoText}
              </span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-center text-white px-4 animate-fadeIn">
          <button
            onClick={() => onNavigate('menu')}
            className="bg-yellow-400 text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-yellow-300 transition-all transform hover:scale-110 shadow-2xl animate-bounce"
          >
            Order Now
          </button>
          
        </div>
      </div>

      {activeAnnouncements.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-6 md:mb-8 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-yellow-300" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-yellow-300">
              Latest Announcements
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {activeAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="group rounded-2xl border border-yellow-500/30 bg-neutral-900/70 p-5 md:p-6 shadow-lg hover:border-yellow-400/60 hover:bg-neutral-900/90 transition-all"
              >
                <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-500/15 text-green-300 border border-green-500/30 mb-3">
                  Active now
                </div>
                <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-yellow-500/15 text-yellow-200 border border-yellow-500/30 mb-3 ml-2">
                  Promo Update
                </div>
                <h3 className="text-xl font-bold text-yellow-300 mb-2 leading-tight">
                  {announcement.title}
                </h3>
                <p className="text-gray-200 leading-relaxed">
                  {announcement.content}
                </p>
                <p className="mt-4 text-xs text-gray-400">
                  {new Date(announcement.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12 text-yellow-300">
          Why Choose Us?
        </h2>
        <div className="space-y-4">
          <div className="text-center px-4 py-3 bg-neutral-900/60 rounded-lg border border-yellow-500/30">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pizza className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-yellow-300">Fresh Ingredients</h3>
            <p className="text-gray-300">
              We use only the freshest, highest-quality ingredients in every pizza
            </p>
          </div>

          <div className="text-center px-4 py-3 bg-neutral-900/60 rounded-lg border border-yellow-500/30">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-yellow-300">Fast Delivery</h3>
            <p className="text-gray-300">
              Hot and fresh pizza delivered to your door in no time
            </p>
          </div>

          <div className="text-center px-4 py-3 bg-neutral-900/60 rounded-lg border border-yellow-500/30">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-yellow-300">Made with Love</h3>
            <p className="text-gray-300">
              Every pizza is crafted with passion and care
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes kaedys-marquee-left {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: inline-flex;
          min-width: 200%;
          animation: kaedys-marquee-left 10s linear infinite;
        }
      `}</style>
    </div>
  );
}
