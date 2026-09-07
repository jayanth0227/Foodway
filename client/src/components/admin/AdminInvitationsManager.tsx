import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';
import { Mail, Phone, User, Calendar, Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export const AdminInvitationsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/invitations`);
      if (res.data?.success && Array.isArray(res.data.invitations)) {
        setInvitations(res.data.invitations);
      }
    } catch (err: any) {
      console.warn('Failed to fetch invitation requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invitation request?')) return;
    try {
      const res = await axios.delete(`${API_BASE_URL}/admin/invitations/${id}`);
      if (res.data?.success) {
        setInvitations(prev => prev.filter(i => i.id !== id));
        setStatusMsg({ type: 'success', message: 'Invitation request deleted' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Failed to delete invitation' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-4">
        <div>
          <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Subscriber Requests</span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight">Request Invitations Manager</h1>
        </div>

        <button
          onClick={fetchInvitations}
          className="btn-secondary py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-3 ${
          statusMsg.type === 'success' ? 'bg-success/15 border border-success/30 text-success' : 'bg-error/15 border border-error/30 text-error'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-text-muted flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="animate-spin text-primary" size={28} />
          <p className="text-sm font-semibold">Fetching Invitation Requests from DynamoDB...</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="glass-panel p-12 text-center text-text-muted border border-glass rounded-2xl space-y-2">
          <Mail size={36} className="mx-auto opacity-40 text-primary" />
          <h3 className="font-bold text-text-primary text-base">No Invitation Requests Found</h3>
          <p className="text-xs">When users apply via the home page "Request Your Invitation" form, their details will appear here.</p>
        </div>
      ) : (
        <div className="glass-panel border border-glass rounded-2xl overflow-hidden shadow-luxury">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-dark/80 text-primary uppercase font-extrabold tracking-wider border-b border-glass">
                <tr>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Phone Number</th>
                  <th className="py-4 px-6">Date Requested</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass/30 font-medium text-text-secondary">
                {invitations.map((inv) => (
                  <tr key={inv.id || inv.email} className="hover:bg-glass/10 transition-colors">
                    <td className="py-4 px-6 font-bold text-text-primary flex items-center space-x-2">
                      <User size={15} className="text-primary shrink-0" />
                      <span>{inv.name || 'Guest User'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <a href={`mailto:${inv.email}`} className="text-text-primary hover:text-primary transition-colors flex items-center space-x-1.5">
                        <Mail size={13} className="text-primary/70 shrink-0" />
                        <span>{inv.email}</span>
                      </a>
                    </td>
                    <td className="py-4 px-6">
                      <a href={`tel:${inv.phone}`} className="text-text-primary hover:text-primary transition-colors flex items-center space-x-1.5">
                        <Phone size={13} className="text-primary/70 shrink-0" />
                        <span>{inv.phone || 'N/A'}</span>
                      </a>
                    </td>
                    <td className="py-4 px-6 text-text-muted">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleString('en-IN') : 'Recently'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                        {inv.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Request"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminInvitationsManager;
