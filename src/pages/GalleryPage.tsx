import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, GalleryImage } from '../lib/supabase';

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .order('display_order', { ascending: true });

    if (data && data.length > 0) {
      setImages(data);
    } else {
      setImages([
        {
          id: '1',
          image_url: 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg?auto=compress&cs=tinysrgb&w=1200',
          display_order: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          image_url: 'https://images.pexels.com/photos/1653877/pexels-photo-1653877.jpeg?auto=compress&cs=tinysrgb&w=1200',
          display_order: 2,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          image_url: 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=1200',
          display_order: 3,
          created_at: new Date().toISOString(),
        },
        {
          id: '4',
          image_url: 'https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg?auto=compress&cs=tinysrgb&w=1200',
          display_order: 4,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4 flex items-center justify-center">
        <p className="text-xl text-gray-300">Loading gallery...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-4">
            Gallery
          </h1>
          <p className="text-xl text-gray-300">
            Take a look at our delicious creations
          </p>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-2xl p-4 md:p-8 mb-8 border border-yellow-500/30">
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <img
              src={images[currentIndex].image_url}
              alt={`Gallery ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-500"
            />

            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black p-3 rounded-full shadow-lg transition-all transform hover:scale-110 border border-yellow-500/60"
            >
              <ChevronLeft className="w-6 h-6 text-yellow-300" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black p-3 rounded-full shadow-lg transition-all transform hover:scale-110 border border-yellow-500/60"
            >
              <ChevronRight className="w-6 h-6 text-yellow-300" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-yellow-400 w-8'
                      : 'bg-yellow-400/40 hover:bg-yellow-400/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transform transition-all hover:scale-105 ${
                index === currentIndex
                  ? 'ring-4 ring-yellow-400 shadow-xl'
                  : 'hover:shadow-lg'
              }`}
            >
              <img
                src={image.image_url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
