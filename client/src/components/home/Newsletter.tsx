import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section id="newsletter" className="py-24 bg-bg-dark border-t border-glass relative overflow-hidden">
      {/* Dynamic ambient orb lights */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
        <div className="glass-panel border border-glass rounded-3xl p-8 md:p-16 text-center relative glow-gold">
          {/* Inner gold border gradient accent */}
          <div className="absolute inset-0 rounded-3xl border border-primary/10 pointer-events-none" />

          <div className="max-w-xl mx-auto space-y-6">
            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
              Exclusive Access
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-gradient-gold">
              Request Your Invitation
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Subscribe to the MK Chronicles. Receive announcements of new Michelin kitchen partners, private dining reserves, and exclusive dining charters.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary font-medium text-sm"
              >
                Your request has been dispatched. Welcome to the dynasty.
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 pt-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="enter your royal email address"
                  required
                  className="flex-grow bg-black/60 border border-glass focus:border-primary/50 text-text-primary placeholder-text-muted/60 text-sm px-5 py-4 rounded-xl outline-none transition-all duration-300 focus:ring-1 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-black font-bold text-xs py-4 px-8 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-primary/15 shrink-0"
                >
                  Apply Now
                </button>
              </form>
            )}
            
            <p className="text-[10px] text-text-muted">
              We respect your sanctuary. No spam. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Newsletter;
