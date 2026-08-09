import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Trash2 } from 'lucide-react';

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: UserNotification[] = [
  {
    id: 'n1',
    title: 'Welcome to Foodway! 🍔',
    body: 'Discover delicious dishes from top restaurants near you.',
    timestamp: 'Just now',
    read: false
  }
];

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = () => {
    try {
      const stored = localStorage.getItem('mk_user_notifications');
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        setNotifications(INITIAL_NOTIFICATIONS);
      }
    } catch (e) {
      setNotifications(INITIAL_NOTIFICATIONS);
    }
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('mk_user_notifications', JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem('mk_user_notifications', JSON.stringify([]));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-start justify-end p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        />

        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="relative z-10 w-full max-w-sm bg-white dark:bg-bg-darkSec border border-slate-200 dark:border-glass rounded-3xl shadow-luxury text-slate-900 dark:text-white overflow-hidden mt-16 sm:mt-20 font-sans"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-glass flex items-center justify-between bg-slate-50/80 dark:bg-bg-cardSec/80 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                <Bell size={16} />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-display">
                Notifications
              </h3>
            </div>

            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Clear All"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[50vh] overflow-y-auto p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-text-muted">No new notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-glass border border-slate-100 dark:border-glass space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-900 dark:text-white">{n.title}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-text-muted">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotificationCenterModal;
