import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, ShieldCheck, FileText, Lock } from 'lucide-react';
import { PolicyModal } from './PolicyModal';

import { useEffect } from 'react';
import { API_BASE_URL } from '../../utils/api';

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'cancellation' | null>(null);
  const currentYear = new Date().getFullYear();
  const [contactInfo, setContactInfo] = useState({
    email: 'mkdeliveryservices12@gmail.com',
    phone: '+91 9573041191',
    address: 'Ravulapalem-533238',
    whatsapp: '+919573041191',
    instagram: 'https://instagram.com/mkdeliveryservices',
    copyrightText: '© 2026 MK DELIVERY SERVICES. ALL RIGHTS RESERVED.'
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/cms/homepage`)
      .then(res => res.json())
      .then(data => {
        if (data?.success && data?.cms?.contactDetails) {
          setContactInfo(prev => ({ ...prev, ...data.cms.contactDetails }));
        }
      })
      .catch(() => {});
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="footer" className="bg-bg-cardSec border-t border-glass pt-10 pb-28 sm:pb-8 relative overflow-hidden transition-colors duration-400">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Main Footer Layout Grid */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8 pb-8 border-b border-glass">
          
          {/* Brand Identity & Subheading */}
          <div className="space-y-3 max-w-md">
            <Link to="/" onClick={handleScrollToTop} className="inline-flex items-center space-x-3 group">
              <img
                src="/logo.jpeg"
                alt="MK Delivery Logo"
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

            {/* Social Icons (WhatsApp & Instagram) */}
            <div className="flex items-center space-x-3 pt-1">
              {contactInfo.whatsapp && (
                <a
                  href={contactInfo.whatsapp.startsWith('http') ? contactInfo.whatsapp : `https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"
                  title={`Chat on WhatsApp (${contactInfo.phone})`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0012.04 2zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.16 8.16 0 01-1.26-4.38c0-4.51 3.67-8.18 8.18-8.18 2.18 0 4.24.85 5.79 2.4 1.54 1.55 2.39 3.61 2.39 5.79 0 4.52-3.67 8.19-8.17 8.19zm4.49-6.14c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.98-.15.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.21-.18-.46-.3z" />
                  </svg>
                </a>
              )}

              {contactInfo.instagram && (
                <a
                  href={contactInfo.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-500 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"
                  title="Follow on Instagram"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Contact Details Column */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              Contact Details
            </h4>

            <ul className="space-y-2 text-xs text-text-muted font-medium">
              <li className="flex items-center space-x-2.5">
                <Mail size={14} className="text-primary shrink-0" />
                <a href={`mailto:${contactInfo.email}`} className="hover:text-primary transition-colors truncate">
                  {contactInfo.email}
                </a>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone size={14} className="text-primary shrink-0" />
                <a href={`tel:${contactInfo.phone}`} className="hover:text-primary transition-colors">
                  {contactInfo.phone}
                </a>
              </li>
              <li className="flex items-start space-x-2.5">
                <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                <span>{contactInfo.address}</span>
              </li>
            </ul>
          </div>

          {/* Policies & Links Column */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              Policies & Legal
            </h4>

            <ul className="space-y-2 text-xs font-semibold text-text-muted">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('terms')}
                  className="flex items-center space-x-2 hover:text-primary transition-colors cursor-pointer text-left"
                >
                  <FileText size={14} className="text-primary shrink-0" />
                  <span>Terms & Conditions</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('privacy')}
                  className="flex items-center space-x-2 hover:text-primary transition-colors cursor-pointer text-left"
                >
                  <Lock size={14} className="text-primary shrink-0" />
                  <span>Privacy Policy</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('cancellation')}
                  className="flex items-center space-x-2 hover:text-primary transition-colors cursor-pointer text-left"
                >
                  <ShieldCheck size={14} className="text-primary shrink-0" />
                  <span>Cancellation Policy</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-glass flex flex-col sm:flex-row items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted">
          <p>{contactInfo.copyrightText || `© ${currentYear} MK DELIVERY SERVICES. ALL RIGHTS RESERVED.`}</p>
        </div>

      </div>

      {/* Shared Interactive Policy Modal */}
      <PolicyModal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        initialTab={activeModal || 'terms'}
      />
    </footer>
  );
};

export default Footer;

