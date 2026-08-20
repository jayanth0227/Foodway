import React, { useState, useEffect } from 'react';
import { FileText, ShieldCheck, Lock, X } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy' | 'cancellation';
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'cancellation'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-bg-card border border-slate-200 dark:border-glass rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col transition-all">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-glass shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              {activeTab === 'terms' && <FileText size={20} />}
              {activeTab === 'privacy' && <Lock size={20} />}
              {activeTab === 'cancellation' && <ShieldCheck size={20} />}
            </div>
            <div>
              <h3 className="font-display font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight">
                {activeTab === 'terms' && 'Terms & Conditions'}
                {activeTab === 'privacy' && 'Privacy Policy'}
                {activeTab === 'cancellation' && 'Cancellation & Refund Policy'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-text-muted font-medium">
                MK Delivery Services • Konaseema
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-glass hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer text-slate-600 dark:text-white shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm text-slate-600 dark:text-text-secondary leading-relaxed font-medium custom-scrollbar flex-grow">
          {activeTab === 'terms' && (
            <>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">1. General Rules & Responsibilities</h4>
                <p>By using MK Delivery Services, customers, merchants, and riders agree to provide accurate and truthful information. Customers are responsible for providing correct delivery addresses and contact numbers.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">2. Service & Order Facilitation</h4>
                <p>MK Delivery Services primarily facilitates ordering and delivery services between customers, merchants, and riders. All orders are subject to merchant acceptance, stock availability, and operational conditions.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">3. Merchant Responsibilities</h4>
                <p>Merchants are responsible for accurate product listings, availability, pricing, food preparation, and prompt order acceptance.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">4. Delivery Times & Operational Factors</h4>
                <p>Delivery times are estimates and may vary depending on merchant preparation time, rider availability, traffic, weather, and operational factors across Konaseema.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">5. Account Usage & Fraud Prevention</h4>
                <p>Users must not create fraudulent or fake orders or misuse the application. MK Delivery Services reserves the right to restrict or suspend accounts violating these terms.</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-1">
                <h4 className="font-black text-xs uppercase tracking-wider">Payment Method Note</h4>
                <p className="text-xs font-semibold">Currently, MK Delivery Services does NOT provide online card/UPI payment functionality. Orders are processed via Cash on Delivery (COD) / Payment at Delivery. Online payment features and online refund clauses are not active at this time.</p>
              </div>
            </>
          )}

          {activeTab === 'privacy' && (
            <>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">1. Information We Collect</h4>
                <p>MK Delivery Services collects essential user details to provide quick-commerce delivery, including:</p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs">
                  <li>Customer name and mobile contact number</li>
                  <li>Delivery address and location information</li>
                  <li>Order details, item preferences, and merchant interactions</li>
                  <li>Rider and delivery-related dispatch information</li>
                  <li>Device and application information necessary for service improvement</li>
                </ul>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">2. Use of Information</h4>
                <p>User information is strictly used for legitimate business and service purposes, such as processing orders, executing deliveries, providing customer support, ensuring security, and enhancing app performance.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">3. Protection & Disclosure</h4>
                <p>MK Delivery Services implements reasonable security measures to safeguard user information and does not misuse, sell, or unnecessarily disclose personal data to unauthorized third parties.</p>
              </div>
            </>
          )}

          {activeTab === 'cancellation' && (
            <>
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 text-slate-900 dark:text-white space-y-1 mb-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-primary">Main Cancellation Business Rule</h4>
                <p className="text-xs font-bold">✓ Customer CAN cancel → Before Merchant Acceptance</p>
                <p className="text-xs font-bold text-rose-500">✗ Customer CANNOT cancel → After Merchant Acceptance</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">1. Before Merchant Acceptance</h4>
                <p>If the merchant has not yet accepted the order, the customer can cancel the order directly from the application. The order status will update to cancelled and merchants/riders will not proceed.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">2. After Merchant Acceptance</h4>
                <p>Once a merchant accepts an order, cancellation from the customer application is disabled. Customers cannot directly cancel an order after merchant acceptance to prevent food and product wastage.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">3. Exceptional Cancellations</h4>
                <p>In exceptional circumstances (such as merchant inability to fulfill, store stock issues, or operational problems), MK Delivery Services or the merchant may cancel the order. These decisions are handled per MK Delivery Services operational procedures.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-primary">4. Payment & Refund Note</h4>
                <p>Because MK Delivery Services operates on Payment at Delivery (COD) and does not process online payments, online payment refunds do not apply.</p>
              </div>
            </>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-glass flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95"
          >
            I Understand
          </button>
        </div>

      </div>
    </div>
  );
};

export default PolicyModal;
