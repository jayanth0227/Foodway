import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Database, 
  UploadCloud, 
  Activity, 
  Server, 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

interface DBItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  premium: boolean;
}

interface AWSStatus {
  credentialsConfigured: boolean;
  regions: {
    s3Region: string;
    dynamoRegion: string;
  };
  s3BucketConfigured: boolean;
  dynamoTableConfigured: boolean;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication
  const [adminEmail, setAdminEmail] = useState('');
  
  // Data States
  const [dbItems, setDbItems] = useState<DBItem[]>([]);
  const [awsStatus, setAwsStatus] = useState<AWSStatus | null>(null);
  
  // Loaders
  const [dbLoading, setDbLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  
  // S3 File Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);


  useEffect(() => {
    // Check credentials
    const adminAuthRaw = localStorage.getItem('adminAuth') || sessionStorage.getItem('adminAuth');
    if (!adminAuthRaw) {
      navigate('/admin', { replace: true });
      return;
    }

    try {
      const auth = JSON.parse(adminAuthRaw);
      if (auth.isLoggedIn && auth.role === 'admin') {
        setAdminEmail(auth.email);
        // Load initial dashboard data
        fetchAWSStatus();
        fetchDBItems();
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (e) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchAWSStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/aws/status`);
      setAwsStatus(response.data);
    } catch (error) {
      console.error('Error fetching AWS status:', error);
    }
  };

  const fetchDBItems = async () => {
    setDbLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/db-items`);
      setDbItems(response.data);
    } catch (error) {
      console.error('Error fetching DynamoDB items:', error);
    } finally {
      setDbLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/seed-db`);
      if (response.data.success) {
        // Refresh list
        fetchDBItems();
      }
    } catch (error) {
      console.error('Error seeding DynamoDB:', error);
    } finally {
      setSeeding(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadedUrl(null);
      setUploadError(null);
    }
  };

  const handleUploadToS3 = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const response = await axios.post(`${API_BASE_URL}/admin/upload-s3`, {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: base64Data,
        });

        if (response.data.success) {
          setUploadedUrl(response.data.fileUrl);
          setSelectedFile(null);
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        setUploadError(
          error.response?.data?.details || 
          error.response?.data?.error || 
          'Failed to upload file to S3. Verify bucket region and settings.'
        );
      } finally {
        setUploading(false);
      }
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminAuth');
    navigate('/admin', { replace: true });
  };

  return (
    <div className="relative min-h-screen bg-bg-dark text-text-primary px-4 md:px-8 pt-24 pb-32 md:pb-24 max-w-7xl mx-auto">
      {/* Background glow orbs */}
      <div className="absolute top-[10%] left-[20%] w-[550px] h-[550px] rounded-full bg-primary/5 blur-[150px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[10%] right-[10%] w-[550px] h-[550px] rounded-full bg-accent/5 blur-[150px] pointer-events-none" />

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-glass pb-6 mb-8 z-10 relative">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-ping" />
            <span>Admin Console Live</span>
          </div>
          <h1 className="text-3xl font-black font-display text-gradient-gold tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-text-muted mt-1 font-medium">
            Authorized: <span className="text-text-secondary">{adminEmail}</span>
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-lg border border-glass bg-glass-subtle hover:bg-error/10 hover:border-error/30 hover:text-error text-xs font-bold transition-all duration-300 shadow-sm"
        >
          <LogOut size={14} />
          <span>Exit Console</span>
        </button>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 z-10 relative">
        {/* Stat card: Orders */}
        <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury flex flex-col justify-between h-[130px] hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Sales</span>
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <TrendingUp size={16} />
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black font-display text-text-primary">$24,850</h3>
            <p className="text-[10px] text-success font-semibold mt-1">▲ +12% this week</p>
          </div>
        </div>

        {/* Stat card: Active Sessions */}
        <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury flex flex-col justify-between h-[130px] hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Active Concierges</span>
            <span className="p-2 rounded-lg bg-accent/10 text-accent">
              <Activity size={16} />
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black font-display text-text-primary">12 Live</h3>
            <p className="text-[10px] text-text-muted font-medium mt-1">Healthy server throughput</p>
          </div>
        </div>

        {/* Stat card: S3 Cloud Uploads */}
        <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury flex flex-col justify-between h-[130px] hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">S3 Storage Status</span>
            <span className="p-2 rounded-lg bg-success/10 text-success">
              <Server size={16} />
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-text-primary truncate">
              {awsStatus?.regions?.s3Region || 'ap-south-2'}
            </h3>
            <p className="text-[10px] text-text-muted font-medium mt-1 truncate">
              Bucket: {awsStatus?.s3BucketConfigured ? 'Connected' : 'Not Configured'}
            </p>
          </div>
        </div>

        {/* Stat card: DynamoDB count */}
        <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury flex flex-col justify-between h-[130px] hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">DynamoDB Dishes</span>
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database size={16} />
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black font-display text-text-primary">
              {dbLoading ? '...' : `${dbItems.length} Items`}
            </h3>
            <p className="text-[10px] text-text-muted font-medium mt-1 truncate">
              Region: {awsStatus?.regions?.dynamoRegion || 'eu-north-1'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 relative">
        
        {/* DynamoDB Section (left 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel border border-glass rounded-xl p-6 md:p-8 shadow-luxury">
            <div className="flex items-center justify-between border-b border-glass pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Database className="text-primary" size={20} />
                <h2 className="text-lg font-bold font-display">DynamoDB Tables Manager</h2>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={fetchDBItems}
                  disabled={dbLoading}
                  className="p-2 rounded-lg border border-glass bg-glass-subtle hover:bg-glass hover:text-primary transition-all duration-300 disabled:opacity-50"
                  title="Reload table"
                >
                  <RefreshCw size={14} className={dbLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Content area */}
            {dbLoading && dbItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-text-muted space-y-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Scanning DynamoDB table `{awsStatus?.dynamoTableConfigured ? 'mk-delivery-services' : 'table'}`...</span>
              </div>
            ) : dbItems.length === 0 ? (
              <div className="py-16 px-4 border border-dashed border-glass rounded-xl flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-glass-subtle text-primary border border-primary/20 mb-4">
                  <Database size={32} />
                </div>
                <h3 className="text-sm font-bold text-text-primary mb-1">DynamoDB Table is Empty</h3>
                <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
                  Your DynamoDB table `mk-delivery-services` (Region: {awsStatus?.regions?.dynamoRegion || 'eu-north-1'}) was found successfully, but contains no items. Click below to seed default dishes.
                </p>
                <button
                  onClick={handleSeedDatabase}
                  disabled={seeding}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-bg-dark font-bold text-xs hover:shadow-lg transition-all duration-300 disabled:opacity-75"
                >
                  {seeding ? (
                    <div className="w-4 h-4 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle size={16} />
                      <span>Seed Gourmet Dishes</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-glass text-text-muted font-bold tracking-wider uppercase">
                        <th className="pb-3 font-semibold">Dish Image</th>
                        <th className="pb-3 font-semibold">Name & Category</th>
                        <th className="pb-3 font-semibold">Description</th>
                        <th className="pb-3 font-semibold text-right">Price</th>
                        <th className="pb-3 font-semibold text-center">Premium</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass">
                      {dbItems.map((item) => (
                        <tr key={item.id} className="hover:bg-glass-subtle transition-colors group">
                          <td className="py-3.5 pr-4">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover border border-glass shadow-sm group-hover:scale-105 transition-transform"
                            />
                          </td>
                          <td className="py-3.5 pr-4 font-bold">
                            <div className="text-text-primary text-sm font-semibold">{item.name}</div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-glass-subtle border border-glass text-text-muted">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-text-muted text-[11px] max-w-[200px] leading-relaxed">
                            {item.description}
                          </td>
                          <td className="py-3.5 pr-4 text-right font-black font-display text-primary text-sm">
                            ${item.price}
                          </td>
                          <td className="py-3.5 text-center">
                            {item.premium ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                                <Award size={10} />
                                Gold
                              </span>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {dbItems.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-glass bg-glass-subtle flex gap-4 items-start relative hover:border-primary/20 transition-all">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover border border-glass shrink-0 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-bold text-text-primary truncate">{item.name}</h4>
                          <span className="text-sm font-black font-display text-primary">${item.price}</span>
                        </div>
                        
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-glass border border-glass text-text-muted">
                          {item.category}
                        </span>
                        
                        <p className="text-[10px] text-text-muted mt-2 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                        
                        {item.premium && (
                          <div className="mt-3 flex">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold bg-primary/10 text-primary border border-primary/20">
                              <Award size={8} />
                              Gold
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* S3 Media Center (right 1/3) */}
        <div className="space-y-6">
          <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury">
            <div className="flex items-center gap-3 border-b border-glass pb-4 mb-6">
              <UploadCloud className="text-primary" size={20} />
              <h2 className="text-lg font-bold font-display">S3 File Cloud Center</h2>
            </div>

            <p className="text-xs text-text-muted leading-relaxed mb-5">
              Securely upload images or PDF assets directly to your configured S3 Bucket (`{awsStatus?.s3BucketConfigured ? 'mk-delivery-services' : 's3'}`) in `ap-south-2` (Hyderabad).
            </p>

            {/* Drag and Drop Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-glass hover:border-primary/40 rounded-xl p-6 text-center cursor-pointer bg-glass-subtle hover:bg-glass transition-all duration-300 relative group flex flex-col items-center justify-center min-h-[140px]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf"
                className="hidden"
              />
              
              <UploadCloud size={28} className="text-text-muted group-hover:text-primary transition-colors mb-3" />
              
              {selectedFile ? (
                <div>
                  <span className="block text-xs font-bold text-text-primary truncate max-w-[200px]">
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] text-text-muted font-medium mt-1 block">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                  </span>
                </div>
              ) : (
                <div>
                  <span className="block text-xs font-bold text-text-secondary">Drag & Drop files here</span>
                  <span className="text-[10px] text-text-muted mt-1 block">or click to browse local files</span>
                </div>
              )}
            </div>

            {/* Action Buttons & Progress */}
            {selectedFile && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleUploadToS3}
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-primary to-secondary text-bg-dark font-bold text-xs rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Push to S3</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                  className="px-3.5 py-2.5 rounded-lg border border-glass bg-glass-subtle hover:bg-glass text-xs font-bold transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Upload Error banner */}
            {uploadError && (
              <div className="mt-4 p-3.5 rounded-lg bg-error/10 border border-error/20 text-error text-[10px] font-semibold flex gap-2 leading-relaxed">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Upload Success & Preview */}
            <AnimatePresence>
              {uploadedUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="mt-6 space-y-4 border-t border-glass pt-5"
                >
                  <div className="flex items-center gap-2 text-success font-bold text-xs uppercase tracking-wide">
                    <CheckCircle size={14} />
                    <span>Upload Completed</span>
                  </div>

                  {uploadedUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                    <div className="relative rounded-lg overflow-hidden border border-glass aspect-video shadow-md">
                      <img
                        src={uploadedUrl}
                        alt="Uploaded file preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-glass-subtle border border-glass flex items-center gap-3">
                      <FileText className="text-primary" size={24} />
                      <div className="text-[10px] font-semibold truncate max-w-[180px]">
                        Asset stored successfully in S3
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Resource Public Link:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={uploadedUrl}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="w-full px-3 py-2 rounded border border-glass bg-glass-subtle text-[10px] font-mono outline-none cursor-pointer focus:bg-glass"
                    />
                    <span className="text-[9px] text-text-muted block font-medium">
                      *Click input to select and copy link.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
