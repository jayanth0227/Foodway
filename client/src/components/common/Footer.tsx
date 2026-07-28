import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebookF, FaTwitter, FaLinkedinIn } from 'react-icons/fa';
import { IoMailOutline, IoCallOutline, IoLocationOutline } from 'react-icons/io5';

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
              { icon: <FaInstagram size={16} />, href: 'https://instagram.com' },
              { icon: <FaFacebookF size={15} />, href: 'https://facebook.com' },
              { icon: <FaTwitter size={15} />, href: 'https://twitter.com' },
              { icon: <FaLinkedinIn size={16} />, href: 'https://linkedin.com' },
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
          <h4 className="text-sm font-semibold font-display text-text-primary uppercase tracking-wider mb-6">
            Gourmet Tiers
          </h4>
          <ul className="space-y-3 text-sm text-text-muted">
            {['Signature Menus', 'Michelin Partners', 'Private Dining', 'Bespoke Catering', 'Corporate Concierge'].map((link, idx) => (
              <li key={idx}>
                <a href="#restaurants" className="hover:text-primary transition-colors hover:pl-1 duration-200 block">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Company Links */}
        <div>
          <h4 className="text-sm font-semibold font-display text-text-primary uppercase tracking-wider mb-6">
            Our Estate
          </h4>
          <ul className="space-y-3 text-sm text-text-muted">
            {['About MK', 'Bespoke T&C', 'Curator Careers', 'Press & Media', 'Gourmet Blog'].map((link, idx) => (
              <li key={idx}>
                <a href="#about" className="hover:text-primary transition-colors hover:pl-1 duration-200 block">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold font-display text-text-primary uppercase tracking-wider mb-6">
            Contact Concierge
          </h4>
          <div className="flex items-start space-x-3 text-sm text-text-muted">
            <IoLocationOutline size={18} className="text-primary shrink-0 mt-0.5" />
            <span>100 Royal Crescent, Mayfair, London, W1S</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-text-muted">
            <IoCallOutline size={18} className="text-primary shrink-0" />
            <a href="tel:+442079460958" className="hover:text-primary transition-colors">
              +44 (20) 7946 0958
            </a>
          </div>
          <div className="flex items-center space-x-3 text-sm text-text-muted">
            <IoMailOutline size={18} className="text-primary shrink-0" />
            <a href="mailto:concierge@mkdelivery.com" className="hover:text-primary transition-colors">
              concierge@mkdelivery.com
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 border-t border-glass/40 flex flex-col md:flex-row items-center justify-between text-xs text-text-muted relative z-10">
        <p>© {currentYear} MK Delivery Services. Crafted for Royalty.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a>
          <a href="#privacy" className="hover:text-primary transition-colors">Privacy Charter</a>
          <a href="#cookies" className="hover:text-primary transition-colors">Cookie Settings</a>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
