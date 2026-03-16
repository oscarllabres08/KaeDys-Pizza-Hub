import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-4">
            Contact Us
          </h1>
          <p className="text-xl text-gray-300">
            Get in touch with us
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-neutral-900 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all border border-yellow-500/30">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-yellow-300">
              Phone
            </h3>
            <p className="text-center text-gray-300">+63 123 456 7890</p>
          </div>

          <div className="bg-neutral-900 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all border border-yellow-500/30">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-yellow-300">
              Email
            </h3>
            <p className="text-center text-gray-300">info@kaedyspizza.com</p>
          </div>

          <div className="bg-neutral-900 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all border border-yellow-500/30">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-yellow-300">
              Address
            </h3>
            <p className="text-center text-gray-700">
              <span className="text-gray-300">
                123 Pizza Street<br />
                City, Country
              </span>
            </p>
          </div>

          <div className="bg-neutral-900 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all border border-yellow-500/30">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-yellow-300">
              Business Hours
            </h3>
            <div className="text-center text-gray-300 text-sm">
              <p>Mon-Thu: 10am - 10pm</p>
              <p>Fri-Sat: 10am - 11pm</p>
              <p>Sunday: 11am - 9pm</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-8 border border-yellow-500/30">
          <h2 className="text-2xl font-bold text-yellow-300 mb-6 text-center">
            Send us a Message
          </h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Message
              </label>
              <textarea
                rows={5}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="Your message"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
