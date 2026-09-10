'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LayoutGrid,
  Users,
  Settings,
  BarChart3,
  Shield,
  Eye,
  Trash2,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  LogOut,
  Bell,
  Lock,
  AlertTriangle,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'employer' | 'consultant' | 'candidate' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  joinedDate: string;
  lastLogin: string;
  activityScore: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
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
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showUserModal, setShowUserModal] = useState(false);
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
      const statsResponse = await fetch('/api/admin/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch users
      const usersResponse = await fetch('/api/admin/users');
      const usersData = await usersResponse.json();
      setUsers(usersData);

      // Fetch alerts
      const alertsResponse = await fetch('/api/admin/alerts');
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
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

  // User actions
  const handleSuspendUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to suspend this user?')) {
      try {
        await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
        fetchAdminData();
      } catch (error) {
        console.error('Error suspending user:', error);
      }
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/unsuspend`, { method: 'POST' });
      fetchAdminData();
    } catch (error) {
      console.error('Error unsuspending user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('This action cannot be undone. Delete this user?')) {
      try {
        await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        fetchAdminData();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleBulkAction = async (action: string) => {
    const userIds = Array.from(selectedUsers);
    if (userIds.length === 0) {
      alert('Please select users');
      return;
    }

    try {
      await fetch('/api/admin/users/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, action }),
      });
      fetchAdminData();
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

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
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Shield className="w-10 h-10 text-blue-400" />
              Admin Control Panel
            </h1>
            <p className="text-gray-400 mt-2">Complete platform management system</p>
          </div>
          <Button
            variant="outline"
            className="text-white border-white hover:bg-white hover:text-slate-900"
            onClick={() => {
              /* Logout logic */
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
          <Card className="bg-slate-700 border-slate-600 hover:border-blue-500 transition">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-400">{stats.totalUsers}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.activeUsers} active
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
              <p className="text-3xl font-bold text-yellow-400">
                ₹{stats.platformRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ₹{stats.pendingPayouts.toLocaleString()} pending
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-slate-700 border border-slate-600">
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
                  <h3 className="text-sm text-gray-300 mb-2">System Health</h3>
                  <p className="text-2xl font-bold text-green-400">✓ Operational</p>
                </div>
                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="text-sm text-gray-300 mb-2">Response Time</h3>
                  <p className="text-2xl font-bold text-blue-400">245ms</p>
                </div>
                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="text-sm text-gray-300 mb-2">Database</h3>
                  <p className="text-2xl font-bold text-yellow-400">Connected</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg">
                <h3 className="font-semibold text-blue-300 mb-2">Recent Activity</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• 5 new users registered in the last hour</li>
                  <li>• 12 jobs posted today</li>
                  <li>• 3 placements completed</li>
                  <li>• 2 users flagged for review</li>
                </ul>
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
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-64">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
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
                  className="px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div className="flex gap-2 p-4 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg">
                  <span className="text-sm text-blue-300">
                    {selectedUsers.size} user(s) selected
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction('suspend')}
                  >
                    Suspend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('activate')}
                  >
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete
                  </Button>
                </div>
              )}

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left p-3">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(
                                new Set(filteredUsers.map((u) => u.id))
                              );
                            } else {
                              setSelectedUsers(new Set());
                            }
                          }}
                        />
                      </th>
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
                        className="border-b border-slate-600 hover:bg-slate-600 transition"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedUsers);
                              if (e.target.checked) {
                                newSelected.add(user.id);
                              } else {
                                newSelected.delete(user.id);
                              }
                              setSelectedUsers(newSelected);
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-gray-400">
                          {new Date(user.joinedDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-xs text-gray-400">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.status === 'active' ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSuspendUser(user.id)}
                              >
                                <Lock className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnsuspendUser(user.id)}
                              >
                                Unlock
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-600 rounded-lg border border-slate-500 hover:border-blue-400 cursor-pointer transition">
                  <h3 className="font-semibold text-white mb-2">Job Postings</h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Manage all job listings
                  </p>
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    Manage Jobs
                  </Button>
                </div>

                <div className="p-4 bg-slate-600 rounded-lg border border-slate-500 hover:border-blue-400 cursor-pointer transition">
                  <h3 className="font-semibold text-white mb-2">
                    Featured Content
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Edit homepage & banners
                  </p>
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    Edit Content
                  </Button>
                </div>

                <div className="p-4 bg-slate-600 rounded-lg border border-slate-500 hover:border-blue-400 cursor-pointer transition">
                  <h3 className="font-semibold text-white mb-2">Blog & News</h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Publish & manage articles
                  </p>
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    Manage Posts
                  </Button>
                </div>

                <div className="p-4 bg-slate-600 rounded-lg border border-slate-500 hover:border-blue-400 cursor-pointer transition">
                  <h3 className="font-semibold text-white mb-2">
                    Email Templates
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Customize notifications
                  </p>
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    Edit Templates
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg">
                <h3 className="font-semibold text-yellow-300 mb-2">Maintenance Mode</h3>
                <p className="text-sm text-gray-300 mb-3">
                  Temporarily take the platform offline for maintenance
                </p>
                <Button variant="outline" className="border-yellow-600 text-yellow-300 hover:bg-yellow-900">
                  Enable Maintenance Mode
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Security & Moderation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">
                    Flagged Content
                  </h3>
                  <p className="text-2xl font-bold text-red-400">12</p>
                  <Button size="sm" className="w-full mt-3 bg-red-600 hover:bg-red-700">
                    Review Now
                  </Button>
                </div>

                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">
                    Suspicious Activities
                  </h3>
                  <p className="text-2xl font-bold text-orange-400">5</p>
                  <Button size="sm" className="w-full mt-3 bg-orange-600 hover:bg-orange-700">
                    View Details
                  </Button>
                </div>

                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Audit Logs</h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Track all admin & user activities
                  </p>
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    View Logs
                  </Button>
                </div>

                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">
                    Spam Management
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Block spam & abuse
                  </p>
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    Manage Spam
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-600 rounded-lg border border-slate-500">
                <h3 className="font-semibold text-white mb-3">
                  IP Whitelist/Blacklist
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-500 rounded">
                    <span className="text-sm">192.168.1.100</span>
                    <Button size="sm" variant="ghost">
                      Remove
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" className="w-full">
                    Add IP Address
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="text-sm text-gray-300 mb-2">User Growth</h3>
                  <p className="text-3xl font-bold text-blue-400">+18%</p>
                  <p className="text-xs text-gray-400 mt-1">vs last month</p>
                </div>

                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="text-sm text-gray-300 mb-2">
                    Conversion Rate
                  </h3>
                  <p className="text-3xl font-bold text-green-400">4.2%</p>
                  <p className="text-xs text-gray-400 mt-1">candidates → placed</p>
                </div>

                <div className="p-4 bg-slate-600 rounded-lg">
                  <h3 className="text-sm text-gray-300 mb-2">Avg. Response</h3>
                  <p className="text-3xl font-bold text-purple-400">2.4h</p>
                  <p className="text-xs text-gray-400 mt-1">application → offer</p>
                </div>
              </div>

              <div className="p-4 bg-slate-600 rounded-lg">
                <h3 className="font-semibold text-white mb-3">Reports</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export User Analytics (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Revenue Report (PDF)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Job Performance (Excel)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white">
                    Platform Fee (%)
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    defaultValue="10"
                    className="mt-1 w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white">
                    Minimum Job Title
                  </label>
                  <input
                    type="text"
                    defaultValue="TRICCI Recruitment"
                    className="mt-1 w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white">
                    Support Email
                  </label>
                  <input
                    type="email"
                    defaultValue="support@tricci.in"
                    className="mt-1 w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white">
                    Maintenance Message
                  </label>
                  <textarea
                    placeholder="We are undergoing scheduled maintenance..."
                    className="mt-1 w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white h-24"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                    <span className="text-white">
                      Allow new user registrations
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                    <span className="text-white">
                      Require email verification
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" />
                    <span className="text-white">
                      Enable Two-Factor Authentication
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="bg-green-600 hover:bg-green-700">
                  Save Settings
                </Button>
                <Button variant="outline">Reset to Default</Button>
              </div>
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
