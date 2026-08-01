import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer id="footer" className="bg-bg-cardSec border-t border-glass pt-20 pb-10 relative overflow-hidden transition-colors duration-400">
      {/* Decorative ambient lighting */}
      <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16 relative z-10">
        {/* Brand identity */}
        <div className="space-y-6">
          <Link to="/" onClick={handleScrollToTop} className="flex items-center space-x-3 group">
            <img
              src="/logo.jpeg"
              alt="MK Delivery Services Logo"
              className="w-12 h-12 rounded-full object-cover border border-primary/20 group-hover:border-primary/50 transition-colors"
            />
            <div className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-[0.15em] font-display text-text-primary uppercase group-hover:text-primary transition-colors">
                MK
              </span>
              <span className="text-[10px] font-medium tracking-[0.25em] text-primary mt-0.5 uppercase">
                Delivery
              </span>
            </div>
          </Link>
          <p className="text-sm text-text-muted leading-relaxed max-w-sm">
            Curating and delivering michelin-recommended dishes and premium gourmet selections to your doorstep with white-glove courier care and precision temperature controls.
          </p>
          <div className="flex items-center space-x-3">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                ),
                href: 'https://instagram.com',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                ),
                href: 'https://facebook.com',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                  </svg>
                ),
                href: 'https://twitter.com',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                ),
                href: 'https://linkedin.com',
              },
            ].map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-glass-subtle border border-glass flex items-center justify-center text-text-secondary hover:text-black hover:bg-primary hover:border-primary transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(197,138,106,0.3)]"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold font-display text-text-primary uppercase tracking-widest mb-6">
            Gourmet Tiers
          </h4>
          <ul className="space-y-3.5 text-xs text-text-muted">
            {['Signature Menus', 'Michelin Partners', 'Private Dining', 'Bespoke Catering', 'Corporate Concierge'].map((link, idx) => (
              <li key={idx}>
                <a href="#restaurants" className="hover:text-primary transition-all hover:pl-1.5 duration-300 block font-medium">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Company Links */}
        <div>
          <h4 className="text-xs font-bold font-display text-text-primary uppercase tracking-widest mb-6">
            Our Estate
          </h4>
          <ul className="space-y-3.5 text-xs text-text-muted">
            {['About MK', 'Bespoke T&C', 'Curator Careers', 'Press & Media', 'Gourmet Blog'].map((link, idx) => (
              <li key={idx}>
                <a href="#about" className="hover:text-primary transition-all hover:pl-1.5 duration-300 block font-medium">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold font-display text-text-primary uppercase tracking-widest mb-6">
            Contact Concierge
          </h4>
          <div className="flex items-start space-x-3 text-xs text-text-muted font-medium leading-relaxed">
            <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
            <span>100 Royal Crescent, Mayfair, London, W1S</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-text-muted font-medium">
            <Phone size={16} className="text-primary shrink-0" />
            <a href="tel:+442079460958" className="hover:text-primary transition-all duration-300">
              +44 (20) 7946 0958
            </a>
          </div>
          <div className="flex items-center space-x-3 text-xs text-text-muted font-medium">
            <Mail size={16} className="text-primary shrink-0" />
            <a href="mailto:concierge@mkdelivery.com" className="hover:text-primary transition-all duration-300">
              concierge@mkdelivery.com
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 border-t border-glass flex flex-col md:flex-row items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted relative z-10">
        <p>© {currentYear} MK Delivery Services. Crafted for Royalty.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <Link to="/restaurant/login" className="hover:text-primary transition-colors text-primary font-bold">Restaurant Portal</Link>
          <Link to="/admin" className="hover:text-primary transition-colors">Admin Console</Link>
          <a href="#privacy" className="hover:text-primary transition-colors">Privacy Charter</a>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
