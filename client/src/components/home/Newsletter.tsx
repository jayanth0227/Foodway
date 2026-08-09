import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { NewsletterSkeleton } from './HomePageSkeleton';

export const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
    }
  };

  if (loading) return <NewsletterSkeleton />;


  return (
    <section id="newsletter" className="py-16 md:py-20 lg:py-30 bg-bg-dark border-t border-glass relative overflow-hidden">
      {/* Dynamic ambient orb lights */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
        <div className="glass-panel p-8 md:p-16 text-center relative glow-gold border-gradient-gold">
          {/* Inner gold border gradient accent */}
          <div className="absolute inset-0 rounded-[22px] border border-primary/20 pointer-events-none" />

          <div className="max-w-xl mx-auto space-y-6">
            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
              Exclusive Access
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-gradient-gold">
              Request Your Invitation
            </h2>
            <p className="text-xs md:text-sm text-text-secondary font-medium leading-relaxed">
              Subscribe to the MK Chronicles. Receive announcements of new Michelin kitchen partners, private dining reserves, and exclusive dining charters.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-primary/10 border border-primary/20 rounded-xl text-primary font-bold text-xs md:text-sm shadow-md flex flex-col items-center space-y-2"
              >
                <Mail className="text-primary animate-pulse" size={20} />
                <span>Your request has been dispatched. Welcome to the dynasty.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 pt-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="enter your royal email address"
                  required
                  className="flex-grow bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary placeholder-text-muted/60 text-sm px-5 py-4 rounded-xl outline-none transition-all duration-300 focus:ring-1 focus:ring-primary/20 font-medium"
                />
                <button
                  type="submit"
                  className="btn-primary text-xs font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shrink-0 uppercase tracking-widest"
                >
                  Apply Now
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
