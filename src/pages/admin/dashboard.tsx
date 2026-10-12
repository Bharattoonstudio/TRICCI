'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signOut } from '@/lib/auth/auth-client';
import {
  LayoutGrid,
  Users,
  Settings,
  BarChart3,
  Shield,
  Eye,
  LogOut,
  Bell,
  Lock,
  AlertTriangle,
  X,
} from 'lucide-react';

// Turns a camelCase field name into a readable label, e.g. "currentTitle" -> "Current Title"
const labelize = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

// Formats one value for display in the user-details popup
const showValue = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

function DetailGrid({ items }: { items: [string, unknown][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-gray-400">{label}</dt>
          <dd className="text-white break-words">{showValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'employer' | 'consultant' | 'candidate' | 'admin';
  status: 'active' | 'suspended' | 'removed' | 'pending';
  joinedDate: string;
  lastLogin: string;
  activityScore: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  removedUsers: number;
  totalJobs: number;
  totalApplications: number;
  totalPlacements: number;
  platformRevenue: number;
  pendingPayouts: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  async function openUserDetail(id: string) {
    setDetailId(id);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load user details');
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not load user details');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeUserDetail() {
    setDetailId(null);
    setDetail(null);
    setDetailError('');
  }

  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Pauses, removes or restores an account. Suspend and remove ask for a confirmation and a reason.
  async function changeAccess(target: { id: string; name: string }, action: 'suspend' | 'unsuspend' | 'remove' | 'restore') {
    let reason: string | undefined;
    if (action === 'suspend' || action === 'remove') {
      const verb = action === 'suspend' ? 'Suspend' : 'Remove';
      const effect = action === 'suspend'
        ? 'They will be signed out and cannot sign in until reactivated.'
        : 'They will be signed out and cannot sign in. Their data is kept and the account can be restored.';
      if (!window.confirm(`${verb} ${target.name}? ${effect}`)) return;
      const input = (window.prompt(`Reason for this ${action === 'suspend' ? 'suspension' : 'removal'} (at least 5 characters, recorded in the audit log):`) ?? '').trim();
      if (input.length < 5) {
        setActionMessage(`${verb} cancelled: a reason of at least 5 characters is required.`);
        return;
      }
      reason = input;
    }
    setActionBusy(true);
    setActionMessage('');
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(target.id)}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Action failed');
      const newStatus: User['status'] = action === 'suspend' ? 'suspended' : action === 'remove' ? 'removed' : 'active';
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, status: newStatus } : u)));
      const statsRes = await fetch('/api/admin/stats', { credentials: 'include' });
      if (statsRes.ok) setStats(await statsRes.json());
      setActionMessage(data.message || 'Done.');
      if (detailId === target.id) await openUserDetail(target.id);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionBusy(false);
    }
  }

  function openUsersTab() {
    setActiveTab('users');
    document.getElementById('admin-tabs')?.scrollIntoView({ behavior: 'smooth' });
  }
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Fetch admin data
  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      // Fetch stats
      try {
        const statsResponse = await fetch('/api/admin/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        } else {
          // Provide default stats if API fails
          setStats({
            totalUsers: 0,
            activeUsers: 0,
            suspendedUsers: 0,
            removedUsers: 0,
            totalJobs: 0,
            totalApplications: 0,
            totalPlacements: 0,
            platformRevenue: 0,
            pendingPayouts: 0,
          });
        }
      } catch (e) {
        console.error('Error fetching stats:', e);
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          suspendedUsers: 0,
          removedUsers: 0,
          totalJobs: 0,
          totalApplications: 0,
          totalPlacements: 0,
          platformRevenue: 0,
          pendingPayouts: 0,
        });
      }

      // Fetch users
      try {
        const usersResponse = await fetch('/api/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        } else {
          setUsers([]);
        }
      } catch (e) {
        console.error('Error fetching users:', e);
        setUsers([]);
      }

      // Fetch alerts
      try {
        const alertsResponse = await fetch('/api/admin/alerts');
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          setAlerts(alertsData);
        } else {
          setAlerts([]);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
        setAlerts([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      employer: 'bg-blue-100 text-blue-800',
      consultant: 'bg-green-100 text-green-800',
      candidate: 'bg-yellow-100 text-yellow-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      removed: 'bg-gray-300 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold flex items-center gap-2 sm:gap-3">
              <Shield className="w-7 h-7 sm:w-10 sm:h-10 text-blue-400" />
              Admin Control Panel
            </h1>
            <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Complete platform management system</p>
          </div>
          <Button
            variant="outline"
            className="text-white border-white hover:bg-white hover:text-slate-900 self-start sm:self-auto"
            onClick={async () => {
              try {
                await signOut();
              } finally {
                window.location.href = '/login';
              }
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="mb-6 border-red-500 bg-red-900 bg-opacity-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              System Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div key={idx} className="text-sm text-red-300 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  {alert.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card onClick={openUsersTab} className="cursor-pointer bg-slate-700 border-slate-600 hover:border-blue-500 transition">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-400">{stats.totalUsers}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.activeUsers} active · {stats.suspendedUsers} suspended · {stats.removedUsers} removed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600 hover:border-green-500 transition">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">{stats.totalJobs}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.totalApplications} applications
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600 hover:border-purple-500 transition">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Placements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-400">
                {stats.totalPlacements}
              </p>
              <p className="text-xs text-gray-400 mt-1">Success placements</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-700 border-slate-600 hover:border-yellow-500 transition">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-400">Not calculated yet</p>
              <p className="text-xs text-gray-400 mt-1">Revenue and payouts are not tracked yet</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User details popup (read-only) */}
      {detailId && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
          onClick={closeUserDetail}
        >
          <div
            className="w-full max-w-2xl bg-slate-800 border border-slate-600 rounded-2xl p-4 sm:p-5 my-4 sm:my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">User details</h2>
              <button type="button" onClick={closeUserDetail} className="text-gray-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading && <p className="text-gray-400 text-sm">Loading…</p>}
            {detailError && <p className="text-red-400 text-sm">{detailError}</p>}
            {actionMessage && <p className="text-amber-300 text-sm mb-3">{actionMessage}</p>}

            {detail && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-blue-300 mb-3">Account</h3>
                  <DetailGrid
                    items={[
                      ['Name', detail.user.name],
                      ['Email', detail.user.email],
                      ['Role', detail.user.role],
                      ['Email verified', detail.user.emailVerified],
                      ['Joined', detail.user.createdAt],
                      ['Last updated', detail.user.updatedAt],
                    ]}
                  />
                </section>

                {detail.user.role !== 'admin' && (
                  <section>
                    <h3 className="text-sm font-semibold text-blue-300 mb-3">Access</h3>
                    <p className="text-sm text-gray-300 mb-3">
                      Status: <span className="text-white font-medium">
                        {detail.user.removedAt ? 'Removed' : detail.user.suspendedAt ? 'Suspended' : 'Active'}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detail.user.removedAt ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={actionBusy}
                          onClick={() => changeAccess({ id: detail.user.id, name: detail.user.name }, 'restore')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Restore account
                        </Button>
                      ) : (
                        <>
                          {detail.user.suspendedAt ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionBusy}
                              onClick={() => changeAccess({ id: detail.user.id, name: detail.user.name }, 'unsuspend')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Reactivate account
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionBusy}
                              onClick={() => changeAccess({ id: detail.user.id, name: detail.user.name }, 'suspend')}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              Suspend account
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => changeAccess({ id: detail.user.id, name: detail.user.name }, 'remove')}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Remove account
                          </Button>
                        </>
                      )}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-semibold text-blue-300 mb-3">Activity</h3>
                  <DetailGrid
                    items={[
                      ['Last sign-in', detail.activity.lastSignIn],
                      ['Active sessions', detail.activity.activeSessions],
                      ['Jobs posted', detail.activity.jobsPosted],
                      ['Applications submitted', detail.activity.applications],
                    ]}
                  />
                </section>

                {detail.user.role === 'candidate' && (
                  <section>
                    <h3 className="text-sm font-semibold text-blue-300 mb-3">Consent</h3>
                    <DetailGrid
                      items={[
                        ['Consent status', detail.user.consentStatus],
                        ['Consent granted at', detail.user.consentGrantedAt],
                        ['Consent withdrawn at', detail.user.consentWithdrawnAt],
                        ['Consent given via', detail.user.consentGrantedVia],
                      ]}
                    />
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-semibold text-blue-300 mb-3">
                    {detail.user.role ? `${labelize(detail.user.role)} profile` : 'Profile'}
                  </h3>
                  {detail.profile ? (
                    <DetailGrid
                      items={Object.entries(detail.profile as Record<string, unknown>)
                        .filter(([key]) => key !== 'id' && key !== 'userId')
                        .map(([key, value]) => [labelize(key), value] as [string, unknown])}
                    />
                  ) : (
                    <p className="text-gray-400 text-sm">No profile details saved yet.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs id="admin-tabs" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1 p-1 bg-slate-700 border border-slate-600">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
            <LayoutGrid className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-blue-600">
            <Eye className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-blue-600">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-lg">Dashboard Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="text-sm text-gray-300 mb-2">Platform stats</h3>
                  <p className={`text-2xl font-bold ${stats ? 'text-green-400' : 'text-red-400'}`}>{stats ? 'Loaded' : 'Not loaded'}</p>
                </div>
                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="text-sm text-gray-300 mb-2">User list</h3>
                  <p className={`text-2xl font-bold ${users.length ? 'text-blue-400' : 'text-gray-400'}`}>{users.length ? `${users.length} loaded` : 'None loaded'}</p>
                </div>
                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="text-sm text-gray-300 mb-2">Activity feed</h3>
                  <p className="text-sm text-gray-400">Not connected yet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="w-full sm:w-auto px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="employer">Employer</option>
                  <option value="consultant">Consultant</option>
                  <option value="candidate">Candidate</option>
                </select>
                <select
                  className="w-full sm:w-auto px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="removed">Removed</option>
                </select>
              </div>

              {actionMessage && <p className="text-amber-300 text-sm">{actionMessage}</p>}

              {/* Phone layout: one card per user, same details and actions as the table */}
              <div className="md:hidden space-y-3">
                {filteredUsers.length === 0 && <p className="text-sm text-gray-400">No users match these filters.</p>}
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`rounded-lg border border-slate-600 p-4 ${
                      user.status === 'suspended' ? 'bg-red-950/60' : user.status === 'removed' ? 'bg-slate-800/80' : 'bg-slate-600/40'
                    }`}
                  >
                    <button type="button" onClick={() => openUserDetail(user.id)} className="font-semibold text-white text-left text-base">
                      {user.name}
                    </button>
                    <p className="text-xs text-gray-400 break-all">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                      <Badge className={`${getStatusColor(user.status)} capitalize`}>{user.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Joined {new Date(user.joinedDate).toLocaleDateString()} · Last login {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}
                    </p>
                    {user.role !== 'admin' && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {user.status === 'removed' ? (
                          <Button type="button" size="sm" disabled={actionBusy} onClick={() => changeAccess(user, 'restore')} className="bg-green-600 hover:bg-green-700 text-white">
                            Restore
                          </Button>
                        ) : (
                          <>
                            {user.status === 'suspended' ? (
                              <Button type="button" size="sm" disabled={actionBusy} onClick={() => changeAccess(user, 'unsuspend')} className="bg-green-600 hover:bg-green-700 text-white">
                                Reactivate
                              </Button>
                            ) : (
                              <Button type="button" size="sm" disabled={actionBusy} onClick={() => changeAccess(user, 'suspend')} className="bg-amber-600 hover:bg-amber-700 text-white">
                                Suspend
                              </Button>
                            )}
                            <Button type="button" size="sm" disabled={actionBusy} onClick={() => changeAccess(user, 'remove')} className="bg-red-600 hover:bg-red-700 text-white">
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Users Table (tablet and desktop) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left p-3">Name / Email</th>
                      <th className="text-left p-3">Role</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Joined</th>
                      <th className="text-left p-3">Last Login</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={`border-b border-slate-600 hover:bg-slate-600 transition ${
                          user.status === 'suspended' ? 'bg-red-950/60' : user.status === 'removed' ? 'bg-slate-800/80' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div>
                            <button type="button" onClick={() => openUserDetail(user.id)} className="font-medium text-white hover:text-blue-400 text-left">{user.name}</button>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={`${getStatusColor(user.status)} capitalize`}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-gray-400">
                          {new Date(user.joinedDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-xs text-gray-400">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3">
                          {user.role !== 'admin' && (
                            <div className="flex flex-wrap gap-2">
                              {user.status === 'removed' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={actionBusy}
                                  onClick={() => changeAccess(user, 'restore')}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Restore
                                </Button>
                              ) : (
                                <>
                                  {user.status === 'suspended' ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={actionBusy}
                                      onClick={() => changeAccess(user, 'unsuspend')}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      Reactivate
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={actionBusy}
                                      onClick={() => changeAccess(user, 'suspend')}
                                      className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                      Suspend
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={actionBusy}
                                    onClick={() => changeAccess(user, 'remove')}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Remove
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-sm text-gray-400">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Management Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Content & Website Control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">Not built yet. This section will be added in a later phase.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Security & Moderation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">Not built yet. This section will be added in a later phase.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">Not built yet. This section will be added in a later phase.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">Not built yet. This section will be added in a later phase.</p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Admin Dashboard v1.0 • Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
