import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCw,
  Filter,
  Check,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import deliveryLocationService from '../../services/deliveryLocation.service';
import type { DeliveryLocation, CreateLocationDTO, UpdateLocationDTO, DeliveryLocationStatus } from '../../types/deliveryLocation';


interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export const AdminDeliveryLocations: React.FC = () => {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<DeliveryLocation | null>(null);
  const [deactivatingLocation, setDeactivatingLocation] = useState<DeliveryLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<DeliveryLocation | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    region: string;
    pincode: string;
    latitude: string;
    longitude: string;
    status: DeliveryLocationStatus;
  }>({
    name: '',
    region: '',
    pincode: '',
    latitude: '',
    longitude: '',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryLocationService.getAdminLocations();
      setLocations(data);
    } catch (err: any) {
      console.error('Failed to fetch admin locations:', err);
      setError('Unable to load delivery locations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Unique list of regions for filter dropdown
  const uniqueRegions = useMemo(() => {
    const regions = new Set<string>();
    locations.forEach((l) => {
      if (l.region) regions.add(l.region.trim());
    });
    return Array.from(regions).sort();
  }, [locations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Status Filter
      if (statusFilter !== 'ALL' && loc.status !== statusFilter) return false;

      // Region Filter
      if (regionFilter !== 'ALL' && loc.region.toLowerCase() !== regionFilter.toLowerCase()) return false;

      // Search Query Filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = loc.name.toLowerCase().includes(query);
        const matchesRegion = loc.region.toLowerCase().includes(query);
        const matchesPincode = loc.pincode ? loc.pincode.includes(query) : false;
        return matchesName || matchesRegion || matchesPincode;
      }

      return true;
    });
  }, [locations, statusFilter, regionFilter, searchQuery]);

  // Open Modal helpers
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      region: '',
      pincode: '',
      latitude: '',
      longitude: '',
      status: 'ACTIVE',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (loc: DeliveryLocation) => {
    setEditingLocation(loc);
    setFormData({
      name: loc.name,
      region: loc.region,
      pincode: loc.pincode || '',
      latitude: loc.latitude !== undefined ? String(loc.latitude) : '',
      longitude: loc.longitude !== undefined ? String(loc.longitude) : '',
      status: loc.status,
    });
    setFormError(null);
  };

  // Form Submit Handlers
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Location Name is required.');
      return;
    }
    if (!formData.region.trim()) {
      setFormError('Region / Area is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const dto: CreateLocationDTO = {
        name: formData.name.trim(),
        region: formData.region.trim(),
        pincode: formData.pincode.trim() || undefined,
        latitude: formData.latitude.trim() ? Number(formData.latitude) : undefined,
        longitude: formData.longitude.trim() ? Number(formData.longitude) : undefined,
        status: formData.status,
      };

      const created = await deliveryLocationService.createLocation(dto);
      setLocations((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      addToast(`✓ Location "${created.name}" added successfully.`);
    } catch (err: any) {
      console.error('Create location failed:', err);
      setFormError(err.response?.data?.message || 'Failed to add location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;

    if (!formData.name.trim()) {
      setFormError('Location Name is required.');
      return;
    }
    if (!formData.region.trim()) {
      setFormError('Region / Area is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const dto: UpdateLocationDTO = {
        name: formData.name.trim(),
        region: formData.region.trim(),
        pincode: formData.pincode.trim() || undefined,
        latitude: formData.latitude.trim() ? Number(formData.latitude) : undefined,
        longitude: formData.longitude.trim() ? Number(formData.longitude) : undefined,
        status: formData.status,
      };

      const updated = await deliveryLocationService.updateLocation(editingLocation.locationId, dto);
      setLocations((prev) =>
        prev.map((l) => (l.locationId === editingLocation.locationId ? updated : l))
      );
      setEditingLocation(null);
      addToast(`✓ ${updated.name} location updated successfully.`);
    } catch (err: any) {
      console.error('Update location failed:', err);
      setFormError(err.response?.data?.message || 'Failed to update location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status Handler
  const handleConfirmToggleStatus = async () => {
    if (!deactivatingLocation) return;
    const target = deactivatingLocation;
    const newStatus: DeliveryLocationStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    setIsSubmitting(true);
    try {
      const updated = await deliveryLocationService.updateLocationStatus(target.locationId, newStatus);
      setLocations((prev) =>
        prev.map((l) => (l.locationId === target.locationId ? updated : l))
      );
      setDeactivatingLocation(null);
      addToast(
        newStatus === 'ACTIVE'
          ? `✓ Location "${updated.name}" activated.`
          : `✓ Location "${updated.name}" deactivated.`
      );
    } catch (err: any) {
      console.error('Toggle location status failed:', err);
      addToast(`Failed to update status for ${target.name}.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Location Handler
  const handleConfirmDelete = async () => {
    if (!deletingLocation) return;
    const target = deletingLocation;

    setIsSubmitting(true);
    try {
      await deliveryLocationService.deleteLocation(target.locationId);
      setLocations((prev) => prev.filter((l) => l.locationId !== target.locationId));
      setDeletingLocation(null);
      addToast(`✓ Location "${target.name}" deleted successfully.`);
    } catch (err: any) {
      console.error('Delete location failed:', err);
      addToast(`Failed to delete location ${target.name}.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-glass pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-1">
            <MapPin size={14} />
            <span>Service Territory</span>
          </div>
          <h1 className="text-3xl font-black font-display text-text-primary tracking-tight">Delivery Locations</h1>
          <p className="text-xs text-text-muted font-medium mt-1">
            Manage the areas where MK Delivery currently operates across Konaseema.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-xl bg-primary text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span> Add Location</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl border border-glass bg-glass-subtle space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        
        {/* Search Input */}
        <div className="relative flex-grow max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder=" Search locations..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg-dark/60 border border-glass rounded-xl text-xs font-semibold text-text-primary placeholder:text-text-muted outline-none focus:border-primary/60 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Status Filter */}
          <div className="flex items-center bg-bg-dark/60 p-1 rounded-xl border border-glass text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ALL' ? 'bg-primary text-black' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All ({locations.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >

              Active ({locations.filter((l) => l.status === 'ACTIVE').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all border ${
                statusFilter === 'INACTIVE'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Inactive ({locations.filter((l) => l.status === 'INACTIVE').length})
            </button>
          </div>

          {/* Region Dropdown Filter */}
          {uniqueRegions.length > 0 && (
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3.5 py-2 bg-bg-dark/60 border border-glass rounded-xl text-xs font-bold text-text-primary outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Regions</option>
              {uniqueRegions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchLocations}
            className="p-2.5 rounded-xl border border-glass bg-bg-dark/60 text-text-muted hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
            title="Refresh locations list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-6 rounded-2xl border border-glass bg-glass-subtle space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-glass/60 rounded" />
          <div className="space-y-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-glass/40 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {!loading && error && (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-3">
          <AlertTriangle size={24} className="text-rose-400 mx-auto" />
          <p className="text-xs font-semibold text-rose-300">{error}</p>
          <button
            type="button"
            onClick={fetchLocations}
            className="px-4 py-2 rounded-xl bg-primary text-black font-extrabold text-xs uppercase"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredLocations.length === 0 && (
        <div className="p-12 rounded-3xl border border-glass bg-glass-subtle text-center space-y-4 max-w-lg mx-auto">
          <div className="p-4 rounded-full bg-primary/10 text-primary inline-flex">
            <MapPin size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary">No delivery locations found</h3>
          <p className="text-xs text-text-muted font-medium">
            {searchQuery || statusFilter !== 'ALL' || regionFilter !== 'ALL'
              ? 'No locations match your current search or filter criteria.'
              : 'Start by adding your first delivery location.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-xl bg-primary text-black font-extrabold text-xs uppercase tracking-wider shadow-md hover:brightness-110 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Add Location</span>
          </button>
        </div>
      )}

      {/* Locations Table / Grid */}
      {!loading && !error && filteredLocations.length > 0 && (
        <div className="rounded-2xl border border-glass bg-glass-subtle overflow-hidden shadow-xl">
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-glass bg-bg-dark/40 text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                  <th className="p-4">Location Name</th>
                  <th className="p-4">Region / Area</th>
                  <th className="p-4">Pincode</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass/40 text-xs font-semibold text-text-primary">
                {filteredLocations.map((loc) => (
                  <tr
                    key={loc.locationId}
                    className="hover:bg-glass/40 transition-colors duration-200"
                  >
                    {/* Location Name */}
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                          <MapPin size={14} />
                        </div>
                        <div>
                          <span className="font-bold font-display text-text-primary block">{loc.name}</span>
                          {(loc.latitude !== undefined || loc.longitude !== undefined) && (
                            <span className="text-[10px] text-text-muted font-mono">
                              Geo: {loc.latitude || '-'}, {loc.longitude || '-'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Region */}
                    <td className="p-4 text-text-secondary font-medium">{loc.region}</td>

                    {/* Pincode */}
                    <td className="p-4 font-mono font-bold">
                      {loc.pincode ? (
                        <span className="px-2 py-0.5 rounded bg-bg-dark/60 border border-glass text-text-primary">
                          {loc.pincode}
                        </span>
                      ) : (
                        <span className="text-text-muted font-normal italic">N/A</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      {loc.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold uppercase shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="p-4 text-text-muted font-medium">{formatDate(loc.createdAt)}</td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(loc)}
                          className="p-2 rounded-xl bg-glass border border-glass hover:border-primary/40 hover:text-primary text-text-secondary transition-all cursor-pointer"
                          title="Edit Location"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Activate / Deactivate Toggle */}
                        <button
                          type="button"
                          onClick={() => setDeactivatingLocation(loc)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            loc.status === 'ACTIVE'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-black'
                          }`}
                          title={loc.status === 'ACTIVE' ? 'Deactivate Location' : 'Activate Location'}
                        >
                          <Power size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeletingLocation(loc)}
                          className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                          title="Delete Location"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
            {filteredLocations.map((loc) => (
              <div
                key={loc.locationId}
                className="p-4 rounded-xl border border-glass bg-bg-dark/40 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary shrink-0" />
                    <span className="font-bold text-sm text-text-primary">{loc.name}</span>
                  </div>
                  {loc.status === 'ACTIVE' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold uppercase">
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[9px] font-extrabold uppercase">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">


                  <div>
                    <span className="text-text-muted text-[10px] uppercase block">Region:</span>
                    <span className="text-text-primary font-semibold">{loc.region}</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px] uppercase block">Pincode:</span>
                    <span className="text-text-primary font-mono">{loc.pincode || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-glass/40 pt-2.5">
                  <span className="text-[10px] text-text-muted">Added: {formatDate(loc.createdAt)}</span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(loc)}
                      className="p-1.5 rounded-lg bg-glass border border-glass text-text-secondary"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeactivatingLocation(loc)}
                      className={`p-1.5 rounded-lg border ${
                        loc.status === 'ACTIVE'
                          ? 'bg-red-500/15 border-red-500/40 text-red-400'
                          : 'bg-green-500/15 border-green-500/40 text-green-400'
                      }`}
                    >
                      <Power size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingLocation(loc)}
                      className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT LOCATION MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {(isAddModalOpen || editingLocation) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg rounded-3xl border border-glass bg-bg-darkSec p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-glass pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-display text-text-primary">
                      {editingLocation ? 'Edit Delivery Location' : 'Add Delivery Location'}
                    </h2>
                    <p className="text-xs text-text-muted font-medium">
                      {editingLocation ? 'Update details for this delivery area.' : 'Add a new area where MK Delivery operates.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingLocation(null);
                  }}
                  className="p-2 rounded-xl bg-glass border border-glass text-text-muted hover:text-text-primary transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Error Banner */}
              {formError && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-300 flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Body */}
              <form onSubmit={editingLocation ? handleEditSubmit : handleAddSubmit} className="space-y-4">
                
                {/* Location Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-1.5">
                    Location Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Eethakota"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass text-xs font-semibold text-text-primary outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Region / Area */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-1.5">
                    Region / Area <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g. Ravulapalem"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass text-xs font-semibold text-text-primary outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Pincode (Optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-1.5">
                    Pincode <span className="text-text-muted font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 533238"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass text-xs font-mono font-semibold text-text-primary outline-none focus:border-primary transition-all"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Leave blank if this location does not have a distinct pincode.
                  </p>
                </div>

                {/* Geo Coordinates (Optional Grid) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                      Latitude <span className="font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g. 16.8900"
                      className="w-full px-3 py-2 rounded-xl bg-bg-dark border border-glass text-xs font-mono text-text-primary outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                      Longitude <span className="font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g. 81.8400"
                      className="w-full px-3 py-2 rounded-xl bg-bg-dark border border-glass text-xs font-mono text-text-primary outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-1.5">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'ACTIVE' })}
                      className={`py-2.5 rounded-xl border text-xs font-extrabold uppercase transition-all ${
                        formData.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'bg-bg-dark border-glass text-text-muted hover:text-text-primary'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'INACTIVE' })}
                      className={`py-2.5 rounded-xl border text-xs font-extrabold uppercase transition-all ${
                        formData.status === 'INACTIVE'
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400 shadow-sm'
                          : 'bg-bg-dark border-glass text-text-muted hover:text-text-primary'
                      }`}
                    >
                      Inactive
                    </button>

                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-glass flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingLocation(null);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-glass bg-glass-subtle hover:bg-glass text-text-secondary text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-primary text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{editingLocation ? 'Save Changes' : 'Add Location'}</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* ACTIVATE / DEACTIVATE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {deactivatingLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-glass bg-bg-darkSec p-6 shadow-2xl space-y-5 text-center"
            >
              <div className={`p-3.5 rounded-full border inline-flex ${
                deactivatingLocation.status === 'ACTIVE'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-green-500/20 border-green-500/40 text-green-400'
              }`}>
                <Power size={28} />
              </div>

              <div>
                <h3 className="text-lg font-bold font-display text-text-primary">
                  {deactivatingLocation.status === 'ACTIVE'
                    ? `Disable "${deactivatingLocation.name}"?`
                    : `Activate "${deactivatingLocation.name}"?`}
                </h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  {deactivatingLocation.status === 'ACTIVE'
                    ? 'This location will be disabled and marked as Inactive.'
                    : 'This location will instantly become active.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeactivatingLocation(null)}
                  className="px-5 py-2.5 rounded-xl border border-glass bg-glass-subtle text-text-secondary text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToggleStatus}
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg transition-all ${
                    deactivatingLocation.status === 'ACTIVE'
                      ? 'bg-red-500 text-white shadow-red-500/30 hover:brightness-110'
                      : 'bg-green-500 text-black shadow-green-500/30 hover:brightness-110'
                  }`}
                >
                  {deactivatingLocation.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {deletingLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-bg-darkSec p-6 shadow-2xl space-y-5 text-center"
            >
              <div className="p-3.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 inline-flex">
                <Trash2 size={28} />
              </div>

              <div>
                <h3 className="text-lg font-bold font-display text-text-primary">Delete Location?</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="text-text-primary font-bold">&quot;{deletingLocation.name}&quot;</span>?
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingLocation(null)}
                  className="px-5 py-2.5 rounded-xl border border-glass bg-glass-subtle text-text-secondary text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-500/20 hover:brightness-110"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminDeliveryLocations;
