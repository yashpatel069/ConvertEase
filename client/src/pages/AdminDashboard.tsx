import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Users,
  Shield,
  Layers,
  HardDrive,
  Cpu,
  Trash2,
  UserCheck,
  Search,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  storageUsed: number;
  maxStorageLimit: number;
  createdAt: string;
}

interface LogRecord {
  _id: string;
  userId?: {
    name: string;
    email: string;
  };
  originalFileName: string;
  outputFileName?: string;
  toolUsed: string;
  status: 'success' | 'failed';
  durationMs: number;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  // Fetch metrics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data.data;
    }
  });

  // Fetch server load
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['serverMetrics'],
    queryFn: async () => {
      const res = await api.get('/admin/metrics');
      return res.data.data.serverStats;
    },
    refetchInterval: 5000 
  });

  // Fetch registered users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsersList', userSearch, usersPage],
    queryFn: async () => {
      const res = await api.get('/admin/users', {
        params: { search: userSearch, page: usersPage, limit: 5 }
      });
      return res.data.data;
    }
  });

  // Fetch conversion logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['adminLogsList', logsPage],
    queryFn: async () => {
      const res = await api.get('/admin/logs', {
        params: { page: logsPage, limit: 8 }
      });
      return res.data.data;
    }
  });

  // Admin actions
  const changeUserLimitMutation = useMutation({
    mutationFn: async ({ userId, role, maxStorageLimit }: { userId: string; role?: string; maxStorageLimit?: number }) => {
      const res = await api.patch(`/admin/users/${userId}`, { role, maxStorageLimit });
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      toast.success(res.message);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/admin/users/${userId}`);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success(res.message);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Delete user failed.');
    }
  });

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleRoleToggle = (user: UserRecord) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (window.confirm(`Change ${user.name}'s privileges to ${nextRole.toUpperCase()}?`)) {
      changeUserLimitMutation.mutate({ userId: user._id, role: nextRole });
    }
  };

  const handleStorageUpgrade = (user: UserRecord) => {
    const nextLimit = user.maxStorageLimit + 100 * 1024 * 1024;
    changeUserLimitMutation.mutate({ userId: user._id, maxStorageLimit: nextLimit });
  };

  return (
    <div className="space-y-10 pb-12 text-white">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Control Center</h1>
        <p className="text-xs text-white/50 mt-1">Monitor server resources, audit conversion pipelines, and manage accounts.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flat-card flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider">Total Users</span>
            <h3 className="text-2xl font-extrabold text-light-primary">{statsLoading ? <Loader2 size={16} className="animate-spin text-light-primary" /> : statsData?.metrics?.totalUsers}</h3>
          </div>
          <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-light-primary"><Users size={18} /></div>
        </div>
        <div className="flat-card flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider">Conversions</span>
            <h3 className="text-2xl font-extrabold text-light-primary">{statsLoading ? <Loader2 size={16} className="animate-spin text-light-primary" /> : statsData?.metrics?.totalConversions}</h3>
          </div>
          <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-light-primary"><Layers size={18} /></div>
        </div>
        <div className="flat-card flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider">Files Processed</span>
            <h3 className="text-2xl font-extrabold text-light-primary">{statsLoading ? <Loader2 size={16} className="animate-spin text-light-primary" /> : statsData?.metrics?.totalFiles}</h3>
          </div>
          <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-light-primary"><FileSpreadsheet size={18} /></div>
        </div>
        <div className="flat-card flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider">Global Space</span>
            <h3 className="text-xl font-extrabold text-light-primary">{statsLoading ? <Loader2 size={16} className="animate-spin text-light-primary" /> : formatBytes(statsData?.metrics?.totalStorageUsed || 0)}</h3>
          </div>
          <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-light-primary"><HardDrive size={18} /></div>
        </div>
      </div>

      {/* Server Health Metrics */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
        <h3 className="font-bold text-sm flex items-center gap-2 text-white"><Cpu size={16} className="text-orange-accent" /> Hardware Diagnostics</h3>
        
        {metricsLoading ? (
          <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin text-orange-accent" /></div>
        ) : !metricsData ? (
          <p className="text-xs text-white/50">Failed to pull diagnostics.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {/* Memory Bar */}
            <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/10 text-left">
              <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider text-center">Memory Load</h4>
              <div className="text-2xl font-extrabold text-white text-center">{metricsData.memory.percentage}%</div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-accent" style={{ width: `${metricsData.memory.percentage}%` }}></div>
              </div>
              <p className="text-[10px] text-white/40 text-center">{formatBytes(metricsData.memory.used)} / {formatBytes(metricsData.memory.total)}</p>
            </div>
            
            {/* System Info */}
            <div className="space-y-2 p-4 bg-white/[0.02] rounded-xl border border-white/10 text-left flex flex-col justify-center">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 text-center">Engine Info</p>
              <div className="flex justify-between text-xs text-white/70"><span>OS:</span><span className="font-semibold capitalize text-white">{metricsData.platform} ({metricsData.arch})</span></div>
              <div className="flex justify-between text-xs text-white/70"><span>Logical CPUs:</span><span className="font-semibold text-white">{metricsData.cpus} Cores</span></div>
            </div>

            {/* Load average */}
            <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/10 flex flex-col justify-center">
              <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">System Load Metrics</h4>
              <div className="flex gap-4 justify-center mt-2">
                {metricsData.loadAvg.map((avg: number, i: number) => (
                  <div key={i} className="text-center">
                    <span className="text-lg font-black text-white">{avg.toFixed(2)}</span>
                    <span className="block text-[8px] font-bold text-white/40">Load</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* User Management */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-bold text-sm text-white">Registered Accounts</h3>
            <div className="relative w-48">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Find users..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUsersPage(1);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-white/30 text-white placeholder-white/30"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center h-20"><Loader2 className="animate-spin text-orange-accent" /></div>
          ) : !usersData?.users || usersData.users.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-6">No matching users.</p>
          ) : (
            <div className="space-y-3">
              {usersData.users.map((item: UserRecord) => (
                <div key={item._id} className="p-4 bg-silver text-light-primary rounded-xl flex items-center justify-between text-xs border-l-4 border-transparent hover:border-orange-accent transition-all duration-150">
                  <div>
                    <h4 className="font-bold flex items-center gap-1.5 text-light-primary">
                      {item.name}
                      {item.role === 'admin' && <Shield size={12} className="text-danger" />}
                    </h4>
                    <p className="text-[10px] text-light-secondary">{item.email}</p>
                    <p className="text-[9px] text-light-secondary/80 mt-1">Quota: {formatBytes(item.storageUsed)} / {formatBytes(item.maxStorageLimit)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRoleToggle(item)}
                      disabled={changeUserLimitMutation.isPending}
                      className="p-1.5 rounded bg-midnight/5 text-light-secondary hover:text-light-primary hover:bg-midnight/15"
                      title="Privileges"
                    >
                      <UserCheck size={14} />
                    </button>
                    <button
                      onClick={() => handleStorageUpgrade(item)}
                      disabled={changeUserLimitMutation.isPending}
                      className="px-2 py-1 rounded bg-midnight/10 text-light-primary text-[10px] font-bold hover:bg-midnight hover:text-white transition-colors"
                      title="Grant +100MB"
                    >
                      +100MB
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete user ${item.email} permanently? This deletes all files.`)) {
                          deleteUserMutation.mutate(item._id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                      className="p-1.5 rounded bg-midnight/5 text-light-secondary hover:text-danger hover:bg-midnight/15"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {usersData?.pagination && usersData.pagination.totalPages > 1 && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-[9px] text-white/40">Page {usersData.pagination.currentPage} of {usersData.pagination.totalPages}</span>
              <div className="flex gap-1">
                <button disabled={usersPage <= 1} onClick={() => setUsersPage(p => p - 1)} className="px-2.5 py-1 rounded border border-white/10 text-[10px] disabled:opacity-50 hover:border-white/20">Prev</button>
                <button disabled={usersPage >= usersData.pagination.totalPages} onClick={() => setUsersPage(p => p + 1)} className="px-2.5 py-1 rounded border border-white/10 text-[10px] disabled:opacity-50 hover:border-white/20">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Logs */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
          <h3 className="font-bold text-sm text-white font-sans">Audit Logs</h3>
          
          {logsLoading ? (
            <div className="flex items-center justify-center h-20"><Loader2 className="animate-spin text-orange-accent" /></div>
          ) : !logsData?.logs || logsData.logs.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-6">No logs yet.</p>
          ) : (
            <div className="space-y-3">
              {logsData.logs.map((log: LogRecord) => (
                <div key={log._id} className="p-4 bg-silver text-light-primary rounded-xl text-xs space-y-1.5 border-l-4 border-transparent hover:border-orange-accent transition-all duration-150">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[9px] bg-midnight/5 px-2 py-0.5 rounded text-light-primary uppercase tracking-wider">{log.toolUsed}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      log.status === 'success' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                    }`}>{log.status}</span>
                  </div>
                  <div className="truncate text-light-primary font-semibold">{log.originalFileName}</div>
                  <div className="flex justify-between text-[10px] text-light-secondary font-medium">
                    <span>Operator: {log.userId?.name || 'Guest'}</span>
                    <span>Speed: {log.durationMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {logsData?.pagination && logsData.pagination.totalPages > 1 && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-[9px] text-white/40">Page {logsData.pagination.currentPage} of {logsData.pagination.totalPages}</span>
              <div className="flex gap-1">
                <button disabled={logsPage <= 1} onClick={() => setLogsPage(p => p - 1)} className="px-2.5 py-1 rounded border border-white/10 text-[10px] disabled:opacity-50 hover:border-white/20">Prev</button>
                <button disabled={logsPage >= logsData.pagination.totalPages} onClick={() => setLogsPage(p => p + 1)} className="px-2.5 py-1 rounded border border-white/10 text-[10px] disabled:opacity-50 hover:border-white/20">Next</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
