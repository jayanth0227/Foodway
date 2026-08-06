import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer id="footer" className="bg-bg-cardSec border-t border-glass pt-10 pb-8 relative overflow-hidden transition-colors duration-400">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 relative z-10">
        {/* Brand identity */}
        <div className="space-y-3 max-w-md">
          <Link to="/" onClick={handleScrollToTop} className="flex items-center space-x-3 group">
            <img
              src="/logo.jpeg"
              alt="MK Delivery Services Logo"
              className="w-10 h-10 rounded-full object-cover border border-primary/20 group-hover:border-primary/50 transition-colors"
            />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-extrabold tracking-[0.15em] font-display text-text-primary uppercase group-hover:text-primary transition-colors">
                MK Delivery
              </span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-primary mt-0.5 uppercase">
                Services
              </span>
            </div>
          </Link>
          <p className="text-xs text-text-muted leading-relaxed font-medium">
            Fast, fresh food and daily essentials delivered right to your doorstep across Konaseema.
          </p>

          {/* WhatsApp & Instagram Links (Under Logo) */}
          <div className="flex items-center space-x-3 pt-1">
            <a
              href="https://wa.me/919573041191"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"
              title="Chat on WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-500 hover:bg-pink-500 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"
              title="Follow on Instagram"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-text-muted font-medium">
          <div className="flex items-center space-x-2">
            <MapPin size={15} className="text-primary shrink-0" />
            <span>Konaseema, AP, India</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail size={15} className="text-primary shrink-0" />
            <a href="mailto:support@mkdelivery.com" className="hover:text-primary transition-colors">
              mkdeliveryservices12@gmail.com
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-6 border-t border-glass flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-widest text-text-muted relative z-10">
        <p>© {currentYear} MK Delivery Services. All Rights Reserved.</p>
        <div className="flex items-center space-x-5">
          <Link to="/restaurant/login" className="hover:text-primary transition-colors text-primary font-bold">Restaurant Portal</Link>
          <Link to="/admin" className="hover:text-primary transition-colors">Admin Console</Link>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
