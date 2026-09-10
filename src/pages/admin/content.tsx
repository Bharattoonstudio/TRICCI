'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Briefcase,
  FileText,
  Globe,
  Mail,
  Trash2,
  Edit,
  Eye,
  ArrowUp,
  Plus,
  Search,
  Filter,
  Star,
  MoreVertical,
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  status: 'active' | 'draft' | 'closed';
  featured: boolean;
  applications: number;
  createdAt: string;
  expiresAt: string;
  salary?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  status: 'published' | 'draft';
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  lastEdited: string;
  status: 'active' | 'inactive';
}

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showJobModal, setShowJobModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const jobsRes = await fetch('/api/admin/jobs');
      const jobsData = await jobsRes.json();
      setJobs(jobsData);

      const postsRes = await fetch('/api/admin/posts');
      const postsData = await postsRes.json();
      setPosts(postsData);

      const templatesRes = await fetch('/api/admin/email-templates');
      const templatesData = await templatesRes.json();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureJob = async (jobId: string) => {
    try {
      await fetch(`/api/admin/jobs/${jobId}/feature`, { method: 'POST' });
      fetchContent();
    } catch (error) {
      console.error('Error featuring job:', error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Delete this job permanently?')) {
      try {
        await fetch(`/api/admin/jobs/${jobId}`, { method: 'DELETE' });
        fetchContent();
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  const handlePublishPost = async (postId: string) => {
    try {
      await fetch(`/api/admin/posts/${postId}/publish`, { method: 'POST' });
      fetchContent();
    } catch (error) {
      console.error('Error publishing post:', error);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || post.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3 mb-6">
          <Globe className="w-10 h-10 text-purple-400" />
          Content Management
        </h1>
        <p className="text-gray-400">Manage jobs, blog posts, and email templates</p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-slate-700 border border-slate-600">
          <TabsTrigger value="jobs" className="data-[state=active]:bg-blue-600">
            <Briefcase className="w-4 h-4 mr-2" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="blog" className="data-[state=active]:bg-blue-600">
            <FileText className="w-4 h-4 mr-2" />
            Blog
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-blue-600">
            <Mail className="w-4 h-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="homepage" className="data-[state=active]:bg-blue-600">
            <Globe className="w-4 h-4 mr-2" />
            Homepage
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Job Listings ({jobs.length})</CardTitle>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Jobs Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left p-3">Job Title</th>
                      <th className="text-left p-3">Company</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Applications</th>
                      <th className="text-left p-3">Expires</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-slate-600 hover:bg-slate-600 transition"
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-white">{job.title}</p>
                            {job.featured && (
                              <Badge className="mt-1 bg-yellow-600 text-white">
                                <Star className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-gray-300">{job.company}</td>
                        <td className="p-3">
                          <Badge
                            className={
                              job.status === 'active'
                                ? 'bg-green-600 text-white'
                                : job.status === 'draft'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-red-600 text-white'
                            }
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="p-3">{job.applications}</td>
                        <td className="p-3 text-xs text-gray-400">
                          {new Date(job.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Feature"
                              onClick={() => handleFeatureJob(job.id)}
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Edit">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteJob(job.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blog Tab */}
        <TabsContent value="blog" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Blog Posts ({posts.length})</CardTitle>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Write Post
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search posts..."
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Posts Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left p-3">Title</th>
                      <th className="text-left p-3">Author</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Views</th>
                      <th className="text-left p-3">Updated</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((post) => (
                      <tr
                        key={post.id}
                        className="border-b border-slate-600 hover:bg-slate-600 transition"
                      >
                        <td className="p-3">
                          <p className="font-medium text-white">{post.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{post.slug}</p>
                        </td>
                        <td className="p-3 text-gray-300">{post.author}</td>
                        <td className="p-3">
                          <Badge
                            className={
                              post.status === 'published'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-white'
                            }
                          >
                            {post.status}
                          </Badge>
                        </td>
                        <td className="p-3">{post.views.toLocaleString()}</td>
                        <td className="p-3 text-xs text-gray-400">
                          {new Date(post.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 bg-slate-600 rounded-lg border border-slate-500 hover:border-blue-400 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">{template.name}</h3>
                      <Badge
                        className={
                          template.status === 'active'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-white'
                        }
                      >
                        {template.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      Type: {template.type}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      Last edited: {new Date(template.lastEdited).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Homepage Tab */}
        <TabsContent value="homepage" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Homepage Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white block mb-2">
                    Hero Title
                  </label>
                  <input
                    type="text"
                    defaultValue="Find Your Perfect Recruitment Partner"
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-2">
                    Hero Subtitle
                  </label>
                  <textarea
                    defaultValue="Connect employers, consultants, and candidates on TRICCI"
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white h-20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-2">
                    Featured Section Title
                  </label>
                  <input
                    type="text"
                    defaultValue="Trending Opportunities"
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-2">
                    Call-to-Action Button Text
                  </label>
                  <input
                    type="text"
                    defaultValue="Get Started Today"
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-2">
                    Hero Image / Banner
                  </label>
                  <div className="border-2 border-dashed border-slate-500 rounded-lg p-6 text-center">
                    <p className="text-gray-400 mb-3">Click to upload or drag and drop</p>
                    <Button variant="outline">Upload Image</Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="bg-green-600 hover:bg-green-700">
                  Save Changes
                </Button>
                <Button variant="outline">Preview</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Content Manager v1.0 • Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
