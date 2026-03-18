import type { ReactNode } from 'react';
import { ExternalLink, Mail, Phone, MapPin, Clock, Facebook, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  // TODO: replace with your business details
  const contact = {
    phone: '09232785464',
    email: 'kaedyspizzahub@gmail.com',
    facebookUrl: 'https://www.facebook.com/profile.php?id=100089472924463',
    messengerPageId: '100089472924463',
    addressLabel: 'Zone 3, Imperial St., San Isidro (Pob.), Pili, 4418 Camarines Sur',
    // Use lat/lng if you want directions to a specific pin
    lat: 13.558250498004698,
    lng:  123.27197823165085,
    hours: 'Monday - Friday 9am - 9pm | Sat and Sun 9am - 10pm',
  };

  const cards: Array<{
    title: string;
    value: string;
    href?: string;
    external?: boolean;
    icon: ReactNode;
  }> = [
    {
      title: 'Phone',
      value: contact.phone,
      href: `tel:${contact.phone}`,
      icon: <Phone className="w-5 h-5 text-yellow-300" />,
    },
    {
      title: 'Email',
      value: contact.email,
      href: `mailto:${contact.email}`,
      icon: <Mail className="w-5 h-5 text-yellow-300" />,
    },
    {
      title: 'Facebook',
      value: "KaeDy's Pizza Hub",
      href: contact.facebookUrl,
      external: true,
      icon: <Facebook className="w-5 h-5 text-yellow-300" />,
    },
    {
      title: 'Messenger',
      value: 'Message us on Messenger',
      href: `https://m.me/${contact.messengerPageId}`,
      external: true,
      icon: <MessageCircle className="w-5 h-5 text-yellow-300" />,
    },
    {
      title: 'Address',
      value: contact.addressLabel,
      href: `https://www.google.com/maps/dir/?api=1&destination=${contact.lat},${contact.lng}`,
      external: true,
      icon: <MapPin className="w-5 h-5 text-yellow-300" />,
    },
    {
      title: 'Hours',
      value: contact.hours,
      icon: <Clock className="w-5 h-5 text-yellow-300" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 animate-fadeIn">
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-300 mb-2">
            Contact Us
          </h1>
          <p className="text-base md:text-lg text-gray-300">
            Get in touch with us
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <section className="bg-neutral-900/60 rounded-2xl border border-yellow-500/20 shadow-lg p-5 md:p-6">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-yellow-300">Quick contacts</h2>
                <p className="text-sm text-gray-300">Tap a card to open.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((c) => {
                const content = (
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-yellow-300 leading-tight">
                        {c.title}
                      </p>
                      <p className="text-sm text-gray-200/90 truncate">
                        {c.value}
                      </p>
                    </div>
                    {c.href ? (
                      <div className="ml-auto shrink-0 text-gray-400">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    ) : null}
                  </div>
                );

                const baseClass =
                  'w-full overflow-hidden text-left rounded-xl border border-yellow-500/20 bg-neutral-950/40 px-4 py-4 shadow-sm transition hover:border-yellow-400/35 hover:bg-black/35 focus:outline-none focus:ring-2 focus:ring-yellow-400/60';

                if (!c.href) {
                  return (
                    <div key={c.title} className={`${baseClass} opacity-95`}>
                      {content}
                    </div>
                  );
                }

                return (
                  <a
                    key={c.title}
                    href={c.href}
                    target={c.external ? '_blank' : undefined}
                    rel={c.external ? 'noreferrer' : undefined}
                    className={baseClass}
                    aria-label={`${c.title}: ${c.value}`}
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </section>

          <section className="bg-neutral-900 rounded-2xl shadow-lg p-5 md:p-8 border border-yellow-500/30">
            <h2 className="text-xl md:text-2xl font-bold text-yellow-300 mb-5 text-center">
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
                className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all shadow-lg active:scale-[0.99]"
              >
                Send Message
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
