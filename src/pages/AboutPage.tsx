import { useEffect, useState } from 'react';
import { Users, Target, Heart, X } from 'lucide-react';

export default function AboutPage() {
  const [storeImageOpen, setStoreImageOpen] = useState(false);
  const storeImageSrc = './store1.jpg';
  const storeLocation = { lat: 13.558250498004698, lng: 123.27197823165085 };  // set your store latitude/longitude

  useEffect(() => {
    if (!storeImageOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStoreImageOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [storeImageOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-4">
            About Us
          </h1>
          <p className="text-xl text-gray-300">
            Learn more about KaeDy&apos;s Pizza Hub&apos;s pizzas, budget meals, chicken, and milk tea
          </p>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-4 sm:p-6 md:p-8 mb-8 border border-yellow-500/30">
          <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
            <div className="md:w-1/2 flex justify-center">
              <img
                src="./kaedypizza.jpg"
                alt="KaeDy's Pizza Hub"
                className="h-40 w-40 rounded-full shadow-lg border-4 border-yellow-400 object-cover"
              />
            </div>
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold text-yellow-300 mb-4">
                Our Story
              </h2>
              <p className="text-gray-300 mb-4">
                Founded in 2023, KaeDy&apos;s Pizza Hub has been serving not just pizzas, but
                comforting budget meals, crispy chicken, and refreshing milk tea to our community.
                What started as a small family business has grown into a beloved local favorite.
              </p>
              <p className="text-gray-300">
                We believe in using only the freshest ingredients and recipes crafted with care.
                Whether you&apos;re craving rice meals, pasta, chicken, milk tea, or pizza, every
                order is made with love to keep you full and satisfied.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="p-4 bg-black/40 rounded-xl border border-yellow-500/25 flex items-start gap-4">
              <div className="bg-yellow-500/10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold mb-1 text-yellow-300">Our Mission</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  To deliver happiness through delicious, high-quality pizza made with love and the finest
                  ingredients.
                </p>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-yellow-500/25 flex items-start gap-4">
              <div className="bg-yellow-500/10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold mb-1 text-yellow-300">Our Values</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Quality, customer satisfaction, and community are at the heart of everything we do.
                </p>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-yellow-500/25 flex items-start gap-4">
              <div className="bg-yellow-500/10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold mb-1 text-yellow-300">Our Team</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  A dedicated team of passionate pizza makers committed to serving you the best pizza
                  experience.
                </p>
              </div>
            </div>

            {/* Removed "Our Awards" card as requested */}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-8 border border-yellow-500/30">
          <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center">
            Visit Our Store
          </h2>
          <div className="bg-black/40 rounded-lg p-6">
            <div className="mt-6 flex justify-center">
              <div className="w-full max-w-[420px]">
                <button
                  type="button"
                  onClick={() => setStoreImageOpen(true)}
                  className="group relative w-full rounded-xl overflow-hidden border border-yellow-500/25 bg-black/50 shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                  aria-label="View store photo"
                >
                  <img
                    src={storeImageSrc}
                    alt="KaeDy's Pizza Hub store"
                    className="w-full h-[220px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10 opacity-80" />
                  <div className="absolute bottom-2 left-2 right-2 text-left">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-yellow-400/15 text-yellow-200 border border-yellow-500/30">
                      Click to view
                    </span>
                  </div>
                </button>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${storeLocation.lat},${storeLocation.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center px-4 py-3 rounded-xl bg-yellow-400 text-black font-semibold hover:bg-yellow-300 transition-all"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>

        {storeImageOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Close image preview"
              onClick={() => setStoreImageOpen(false)}
            />
            <div className="relative w-full max-w-4xl">
              <div className="relative rounded-2xl overflow-hidden border border-yellow-500/30 bg-black shadow-2xl">
                <img
                  src={storeImageSrc}
                  alt="KaeDy's Pizza Hub store (preview)"
                  className="w-full max-h-[80vh] object-contain bg-black"
                />
                <button
                  type="button"
                  onClick={() => setStoreImageOpen(false)}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-gray-200 border border-yellow-500/25 hover:bg-black/75 hover:text-white transition-all"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-gray-300">
                Press <span className="font-semibold text-gray-100">Esc</span> or click outside to close.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
