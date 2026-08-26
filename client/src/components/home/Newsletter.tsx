import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, User, Phone, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';
import { NewsletterSkeleton } from './HomePageSkeleton';

export const Newsletter: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await axios.post(`${API_BASE_URL}/invitations`, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });

      if (res.data?.success) {
        setSubmitted(true);
        setName('');
        setEmail('');
        setPhone('');
      } else {
        setErrorMsg(res.data?.error || 'Failed to submit invitation request');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <NewsletterSkeleton />;

  return (
    <section id="newsletter" className="py-16 md:py-20 lg:py-30 bg-bg-dark border-t border-glass relative overflow-hidden">
      {/* Dynamic ambient orb lights */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
        <div className="glass-panel p-8 md:p-14 text-center relative glow-gold border-gradient-gold">
          {/* Inner gold border gradient accent */}
          <div className="absolute inset-0 rounded-[22px] border border-primary/20 pointer-events-none" />

          <div className="max-w-xl mx-auto space-y-5">
            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
              Exclusive Access
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-gradient-gold">
              Request Your Invitation
            </h2>
            <p className="text-xs md:text-sm text-text-secondary font-medium leading-relaxed">
              Subscribe to the MK Chronicles. Receive announcements of new Michelin kitchen partners, private dining reserves, and exclusive dining charters.
            </p>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-primary/10 border border-primary/25 rounded-2xl text-primary font-bold text-xs md:text-sm shadow-md flex flex-col items-center space-y-2"
              >
                <CheckCircle2 className="text-primary animate-bounce" size={28} />
                <span>Your invitation request has been dispatched to MK Admin.</span>
                <span className="text-[11px] text-text-muted font-normal">We will get in touch with you shortly.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      required
                      className="w-full bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary placeholder-text-muted/60 text-xs sm:text-sm pl-10 pr-3 py-3 rounded-xl outline-none transition-all duration-300 font-medium"
                    />
                  </div>

                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      required
                      className="w-full bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary placeholder-text-muted/60 text-xs sm:text-sm pl-10 pr-3 py-3 rounded-xl outline-none transition-all duration-300 font-medium"
                    />
                  </div>

                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number"
                      required
                      className="w-full bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary placeholder-text-muted/60 text-xs sm:text-sm pl-10 pr-3 py-3 rounded-xl outline-none transition-all duration-300 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary text-xs font-bold py-3.5 px-8 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg uppercase tracking-widest flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <span>Apply Now</span>
                  )}
                </button>
              </form>
            )}
            
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
              We respect your sanctuary. No spam. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Newsletter;
