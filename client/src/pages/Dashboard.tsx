import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  FileText,
  Image as ImageIcon,
  Folder,
  Download,
  Trash2,
  Star,
  Search,
  ChevronDown,
  Calendar,
  Layers,
  HardDrive,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

interface FileRecord {
  _id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  storageKey: string;
  isFavorite: boolean;
  status: 'pending' | 'completed' | 'failed';
  downloadCount: number;
  createdAt: string;
}

interface DashboardProps {
  isFilesView?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ isFilesView = false }) => {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); 
  const [sortBy, setSortBy] = useState('newest'); 
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // Fetch metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const res = await api.get('/files/analytics');
      return res.data.data;
    },
    enabled: !isFilesView
  });

  // Fetch user files
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['userFiles', search, filter, sortBy, page],
    queryFn: async () => {
      const res = await api.get('/files', {
        params: { search, filter, sortBy, page, limit: 8 }
      });
      return res.data.data;
    }
  });

  // File Mutations
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await api.post(`/files/${fileId}/favorite`);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['userFiles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      toast.success(res.message);
    }
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: string; name: string }) => {
      const res = await api.patch(`/files/${fileId}/rename`, { newName: name });
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['userFiles'] });
      setEditingId(null);
      toast.success('File renamed successfully.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to rename.');
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await api.delete(`/files/${fileId}`);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['userFiles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      refreshProfile(); 
      toast.success('File deleted.');
    }
  });

  const handleDownload = (fileId: string, filename: string) => {
    toast.loading('Preparing download...', { id: 'download-toast' });
    const token = localStorage.getItem('access_token');
    const url = `${api.defaults.baseURL}/files/${fileId}/download?token=${token}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!', { id: 'download-toast' });
  };

  const handleRenameSubmit = (fileId: string) => {
    if (!newName.trim()) return;
    renameFileMutation.mutate({ fileId, name: newName });
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Recharts Chart configurations
  const pieData = metricsData?.typesBreakdown ? [
    { name: 'PDFs', value: metricsData.typesBreakdown.pdf, color: '#F44A22' },
    { name: 'Images', value: metricsData.typesBreakdown.images, color: '#A8AAAC' },
    { name: 'Documents', value: metricsData.typesBreakdown.documents, color: '#161616' },
    { name: 'Others', value: metricsData.typesBreakdown.others, color: '#E4E2E3' }
  ].filter(d => d.value > 0) : [];

  const activityData = [
    { name: 'Mon', count: 4 },
    { name: 'Tue', count: 7 },
    { name: 'Wed', count: 12 },
    { name: 'Thu', count: 9 },
    { name: 'Fri', count: 15 },
    { name: 'Sat', count: 8 },
    { name: 'Sun', count: 5 }
  ];

  return (
    <div className="space-y-10 pb-12 text-white">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {isFilesView ? 'File Manager' : 'Dashboard Overview'}
        </h1>
        <p className="text-xs text-white/50 mt-1">
          {isFilesView ? 'Organize, search, and download your processed assets.' : 'Audits, storage metrics, and conversions logs.'}
        </p>
      </div>

      {/* Analytics cards */}
      {!isFilesView && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flat-card flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider">Total Files</span>
              <h3 className="text-3xl font-extrabold tracking-tight text-light-primary">
                {metricsLoading ? <Loader2 size={16} className="animate-spin text-light-primary" /> : metricsData?.fileCount || 0}
              </h3>
            </div>
            <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-light-primary"><Folder size={18} /></div>
          </div>
          <div className="flat-card flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider">Conversions</span>
              <h3 className="text-3xl font-extrabold tracking-tight text-light-primary">
                {metricsLoading ? <Loader2 size={16} className="animate-spin text-light-primary" /> : metricsData?.conversionsCount || 0}
              </h3>
            </div>
            <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-light-primary"><Layers size={18} /></div>
          </div>
          <div className="flat-card flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider">Favorites</span>
              <h3 className="text-3xl font-extrabold tracking-tight text-light-primary">
                {metricsLoading ? <Loader2 size={16} className="animate-spin text-light-primary" /> : metricsData?.favoriteCount || 0}
              </h3>
            </div>
            <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-light-primary"><Star size={18} /></div>
          </div>
          <div className="flat-card flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider">Storage Space</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-light-primary mt-1">
                {formatBytes(user?.storageUsed || 0)}
              </h3>
            </div>
            <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-light-primary"><HardDrive size={18} /></div>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {!isFilesView && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Area Chart */}
          <div className="lg:col-span-2 p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">Conversion Pipelines Rate</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F44A22" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F44A22" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF', fontSize: 11 }} />
                  <Area type="monotone" dataKey="count" stroke="#F44A22" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4 flex flex-col justify-between">
            <h3 className="font-bold text-sm text-white">Asset Types Breakdown</h3>
            <div className="h-[180px] flex items-center justify-center relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={70} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-white/50">No data compiled.</p>
              )}
              {pieData.length > 0 && (
                <div className="absolute text-center">
                  <span className="text-2xl font-extrabold text-white">{pieData.reduce((s, e) => s + e.value, 0)}</span>
                  <span className="block text-[8px] font-bold text-white/40 uppercase">Files</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-center gap-4 flex-wrap text-[10px] font-semibold text-white/50">
              {pieData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }}></span>
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="space-y-6">
        
        {/* Table Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between border-b border-white/10 pb-6">
          <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl overflow-x-auto self-start w-full lg:w-auto">
            {['all', 'favorites', 'pdf', 'images', 'documents'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all select-none whitespace-nowrap ${
                  filter === tab
                    ? 'bg-orange-accent text-white shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full lg:w-auto items-center">
            {/* Search */}
            <div className="relative flex-grow lg:w-60">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Filter files..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-white/30 text-white placeholder-white/30"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="bg-white/5 border border-white/10 rounded-xl pl-4 pr-8 py-2 text-xs text-white/80 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Files Grid */}
        {filesLoading ? (
          <div className="space-y-3 py-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 w-full bg-white/5 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : !filesData?.files || filesData.files.length === 0 ? (
          <div className="text-center py-16 space-y-2 border border-dashed border-white/10 rounded-2xl">
            <Folder size={32} className="mx-auto text-white/30" />
            <h3 className="font-bold text-xs">No converted documents found</h3>
            <p className="text-[10px] text-white/40">Convert files using client suites to populate history.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filesData.files.map((file: FileRecord) => (
              <div
                key={file._id}
                className="p-4 bg-silver text-light-primary rounded-xl flex items-center justify-between gap-4 border-l-4 border-transparent hover:border-orange-accent transition-all duration-150"
              >
                {/* Details */}
                <div className="flex items-center gap-3 overflow-hidden flex-grow">
                  <div className="w-10 h-10 rounded-xl bg-midnight/5 flex items-center justify-center text-light-primary flex-shrink-0">
                    {file.mimeType.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="overflow-hidden flex-grow">
                    {editingId === file._id ? (
                      <div className="flex items-center gap-2 max-w-sm">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="bg-white/80 border border-midnight px-3 py-1.5 text-xs rounded-lg focus:outline-none w-full text-light-primary font-semibold"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameSubmit(file._id)}
                          className="p-1.5 rounded-lg bg-midnight text-white hover:bg-midnight/80"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg border border-stone-accent text-light-primary hover:text-danger"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <h4
                        className="text-xs font-bold tracking-wide truncate cursor-pointer hover:text-light-primary/80"
                        onClick={() => {
                          setEditingId(file._id);
                          setNewName(file.originalName.replace(/\.[^/.]+$/, ''));
                        }}
                      >
                        {file.originalName}
                      </h4>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-light-secondary mt-1 font-medium">
                      <span>{formatBytes(file.size)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleFavoriteMutation.mutate(file._id)}
                    disabled={toggleFavoriteMutation.isPending}
                    className={`p-2 rounded-lg hover:bg-midnight/5 transition-all ${
                      file.isFavorite ? 'text-warning' : 'text-light-secondary/40 hover:text-warning'
                    }`}
                  >
                    <Star size={15} fill={file.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => handleDownload(file._id, file.originalName)}
                    className="p-2 rounded-lg text-light-secondary/40 hover:text-light-primary hover:bg-midnight/5 transition-all"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this file permanently?')) {
                        deleteFileMutation.mutate(file._id);
                      }
                    }}
                    disabled={deleteFileMutation.isPending}
                    className="p-2 rounded-lg text-light-secondary/40 hover:text-danger hover:bg-midnight/5 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filesData?.pagination && filesData.pagination.totalPages > 1 && (
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <span className="text-[10px] font-semibold text-white/40">
              Showing page {filesData.pagination.currentPage} of {filesData.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-semibold hover:border-white/20 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page >= filesData.pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-semibold hover:border-white/20 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
