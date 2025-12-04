'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Flame, Plus, Eye, EyeOff, Calendar, Trash2, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HotTake {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  published_at: string;
  created_at: string;
}

export default function HotTakesManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hotTakes, setHotTakes] = useState<HotTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newHotTake, setNewHotTake] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/coach/login');
    }
  }, [status, router]);

  // Fetch hot takes
  const fetchHotTakes = async () => {
    try {
      setLoading(true);
      // Coaches need to see ALL hot takes (active and inactive)
      const response = await fetch('/api/hot-takes?include_inactive=true', {
        headers: {
          'Authorization': 'Bearer coach-token',
        },
        cache: 'no-store', // Force fresh data
      });
      const data = await response.json();

      if (data.success) {
        setHotTakes(data.data);
      }
    } catch (error) {
      console.error('[HotTakes] Error fetching hot takes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchHotTakes();
    }
  }, [status]);

  // Create new hot take
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newHotTake.title.trim() || !newHotTake.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/hot-takes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer coach-token',
        },
        body: JSON.stringify(newHotTake),
      });

      const data = await response.json();

      if (data.success) {
        setNewHotTake({ title: '', content: '' });
        await fetchHotTakes();
      } else {
        alert('Failed to create hot take: ' + data.error);
      }
    } catch (error) {
      console.error('[HotTakes] Error creating hot take:', error);
      alert('Failed to create hot take');
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/hot-takes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer coach-token',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchHotTakes();
      } else {
        alert('Failed to update hot take: ' + data.error);
      }
    } catch (error) {
      console.error('[HotTakes] Error updating hot take:', error);
      alert('Failed to update hot take');
    }
  };

  // Delete hot take
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/hot-takes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer coach-token',
        },
      });

      const data = await response.json();

      if (data.success) {
        await fetchHotTakes();
      } else {
        alert('Failed to delete hot take: ' + data.error);
      }
    } catch (error) {
      console.error('[HotTakes] Error deleting hot take:', error);
      alert('Failed to delete hot take');
    }
  };

  // Start editing
  const handleStartEdit = (hotTake: HotTake) => {
    setEditingId(hotTake.id);
    setEditForm({ title: hotTake.title, content: hotTake.content });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', content: '' });
  };

  // Save edited hot take
  const handleSaveEdit = async (id: string) => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      const response = await fetch(`/api/hot-takes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer coach-token',
        },
        body: JSON.stringify({
          title: editForm.title.trim(),
          content: editForm.content.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEditingId(null);
        setEditForm({ title: '', content: '' });
        await fetchHotTakes();
      } else {
        alert('Failed to update hot take: ' + data.error);
      }
    } catch (error) {
      console.error('[HotTakes] Error updating hot take:', error);
      alert('Failed to update hot take');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Flame className="h-8 w-8 animate-pulse text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Hot Takes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Flame className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hot Takes Management</h1>
              <p className="text-sm text-gray-600">Share ad strategy tips with store owners</p>
            </div>
          </div>
          <Button onClick={() => router.push('/bhb')} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {/* Create New Hot Take */}
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-600" />
              <CardTitle>Create New Hot Take</CardTitle>
            </div>
            <CardDescription>
              Share your latest ad strategy insights with all store owners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <Input
                  id="title"
                  type="text"
                  placeholder="E.g., Focus on Mobile-First Creative"
                  value={newHotTake.title}
                  onChange={(e) => setNewHotTake({ ...newHotTake, title: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <Textarea
                  id="content"
                  placeholder="Share your tip or strategy here..."
                  value={newHotTake.content}
                  onChange={(e) => setNewHotTake({ ...newHotTake, content: e.target.value })}
                  rows={4}
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={isCreating} className="w-full">
                {isCreating ? 'Creating...' : 'Publish Hot Take'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Hot Takes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Published Hot Takes</CardTitle>
                <CardDescription>Manage your existing tips and strategies</CardDescription>
              </div>
              <Badge variant="secondary">{hotTakes.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {hotTakes.length === 0 ? (
              <div className="text-center py-12">
                <Flame className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No hot takes yet. Create your first one above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {hotTakes.map((hotTake) => (
                  <div
                    key={hotTake.id}
                    className={`p-4 rounded-lg border ${
                      hotTake.is_active
                        ? 'bg-white border-gray-200'
                        : 'bg-gray-50 border-gray-300 opacity-60'
                    }`}
                  >
                    {editingId === hotTake.id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title
                          </label>
                          <Input
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Content
                          </label>
                          <Textarea
                            value={editForm.content}
                            onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                            rows={4}
                            className="w-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(hotTake.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{hotTake.title}</h3>
                            <Badge variant={hotTake.is_active ? 'default' : 'secondary'}>
                              {hotTake.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{hotTake.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(hotTake.published_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={hotTake.is_active ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleActive(hotTake.id, hotTake.is_active)}
                            className={hotTake.is_active ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {hotTake.is_active ? (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Active
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Inactive
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEdit(hotTake)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(hotTake.id, hotTake.title)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
