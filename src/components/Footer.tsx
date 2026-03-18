import { Pizza } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black text-yellow-300 mt-auto border-t border-yellow-500/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-4">
              <Pizza className="w-8 h-8 mr-2" />
              <h3 className="text-xl font-bold">KaeDy's Pizza Hub</h3>
            </div>
            <p className="text-yellow-200 text-sm">
              Serving the finest pizzas since 2023. Made with love and the freshest ingredients.
            </p>
          </div>

          {/* Contact + Hours removed to keep footer compact on mobile */}
          <div className="hidden md:block" />
          <div className="hidden md:block" />
        </div>

        <div className="border-t border-yellow-500/40 mt-8 pt-6 text-center text-sm text-yellow-200">
          <p>&copy; 2023 KaeDy's Pizza Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
