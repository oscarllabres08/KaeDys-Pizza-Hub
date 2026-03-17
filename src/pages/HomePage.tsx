import { useEffect, useState } from 'react';
import { Pizza, Clock, Heart } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900">
      <div className="relative h-[90vh] flex items-end justify-center bg-black pb-10">
        <img
          src="./store.jpg"
          alt="KaeDy's Pizza Hub Store"
          className="absolute inset-0 w-full h-full object-cover opacity-100  "
        />
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        <div className="relative z-10 text-center text-white px-4 animate-fadeIn">
          <button
            onClick={() => onNavigate('menu')}
            className="bg-yellow-400 text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-yellow-300 transition-all transform hover:scale-110 shadow-2xl animate-bounce"
          >
            Order Now
          </button>
          
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-yellow-300">
            Latest Announcements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all hover:shadow-2xl"
              >
                <h3 className="text-xl font-bold text-yellow-500 mb-3">
                  {announcement.title}
                </h3>
                <p className="text-gray-700">{announcement.content}</p>
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
    </div>
  );
}
