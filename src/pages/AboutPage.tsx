import { Users, Target, Heart, Award } from 'lucide-react';

export default function AboutPage() {
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

        <div className="bg-neutral-900 rounded-xl shadow-lg p-8 mb-8 border border-yellow-500/30">
          <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
            <div className="md:w-1/2 flex justify-center">
              <img
                src="/kaedypizza.jpg"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center p-6 bg-neutral-900 rounded-lg border border-yellow-500/30">
              <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-yellow-300">Our Mission</h3>
              <p className="text-gray-300">
                To deliver happiness through delicious, high-quality pizza made
                with love and the finest ingredients.
              </p>
            </div>

            <div className="text-center p-6 bg-neutral-900 rounded-lg border border-yellow-500/30">
              <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-yellow-300">Our Values</h3>
              <p className="text-gray-300">
                Quality, customer satisfaction, and community are at the heart
                of everything we do.
              </p>
            </div>

            <div className="text-center p-6 bg-neutral-900 rounded-lg border border-yellow-500/30">
              <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-yellow-300">Our Team</h3>
              <p className="text-gray-300">
                A dedicated team of passionate pizza makers committed to
                serving you the best pizza experience.
              </p>
            </div>

            <div className="text-center p-6 bg-neutral-900 rounded-lg border border-yellow-500/30">
              <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-yellow-300">Our Awards</h3>
              <p className="text-gray-300">
                Recognized for excellence in quality, service, and customer
                satisfaction since 2023.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-8 border border-yellow-500/30">
          <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center">
            Visit Our Store
          </h2>
          <div className="bg-black/40 rounded-lg p-6">
            <p className="text-center text-gray-300 mb-2">
              <strong>Address:</strong> 123 Pizza Street, City, Country
            </p>
            <p className="text-center text-gray-300 mb-2">
              <strong>Phone:</strong> +63 123 456 7890
            </p>
            <p className="text-center text-gray-300">
              <strong>Hours:</strong> Monday-Saturday 10am-10pm, Sunday 11am-9pm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
