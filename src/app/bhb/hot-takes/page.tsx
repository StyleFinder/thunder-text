"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Flame,
  Plus,
  Eye,
  EyeOff,
  Calendar,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BHBLayout } from "@/features/bhb";
import { logger } from "@/lib/logger";

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newHotTake, setNewHotTake] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });

  const coachEmail = session?.user?.email || "";
  const coachName = session?.user?.name || "";
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/coach/login");
    }
  }, [status, router]);

  // Fetch hot takes
  const fetchHotTakes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/hot-takes?include_inactive=true", {
        headers: {
          Authorization: "Bearer coach-token",
        },
        cache: "no-store",
      });
      const data = await response.json();

      if (data.success) {
        setHotTakes(data.data);
      }
    } catch (error) {
      logger.error("Error fetching hot takes", error, { component: "hot-takes-page" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchHotTakes();
    }
  }, [status]);

  // Create new hot take
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newHotTake.title.trim() || !newHotTake.content.trim()) {
      alert("Please fill in both title and content");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/hot-takes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer coach-token",
        },
        body: JSON.stringify(newHotTake),
      });

      const data = await response.json();

      if (data.success) {
        setNewHotTake({ title: "", content: "" });
        setShowCreateForm(false);
        await fetchHotTakes();
      } else {
        alert("Failed to create hot take: " + data.error);
      }
    } catch (error) {
      logger.error("Error creating hot take", error, { component: "hot-takes-page" });
      alert("Failed to create hot take");
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/hot-takes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer coach-token",
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchHotTakes();
      } else {
        alert("Failed to update hot take: " + data.error);
      }
    } catch (error) {
      logger.error("Error updating hot take", error, { component: "hot-takes-page" });
      alert("Failed to update hot take");
    }
  };

  // Delete hot take
  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/hot-takes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer coach-token",
        },
      });

      const data = await response.json();

      if (data.success) {
        await fetchHotTakes();
      } else {
        alert("Failed to delete hot take: " + data.error);
      }
    } catch (error) {
      logger.error("Error deleting hot take", error, { component: "hot-takes-page" });
      alert("Failed to delete hot take");
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
    setEditForm({ title: "", content: "" });
  };

  // Save edited hot take
  const handleSaveEdit = async (id: string) => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      alert("Please fill in both title and content");
      return;
    }

    try {
      const response = await fetch(`/api/hot-takes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer coach-token",
        },
        body: JSON.stringify({
          title: editForm.title.trim(),
          content: editForm.content.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEditingId(null);
        setEditForm({ title: "", content: "" });
        await fetchHotTakes();
      } else {
        alert("Failed to update hot take: " + data.error);
      }
    } catch (error) {
      logger.error("Error updating hot take", error, { component: "hot-takes-page" });
      alert("Failed to update hot take");
    }
  };

  // Loading state
  if (status === "loading" || loading) {
    return (
      <BHBLayout
        coachName={coachName}
        coachEmail={coachEmail}
        isAdmin={isAdmin}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-gray-500">Loading Hot Takes...</p>
        </div>
      </BHBLayout>
    );
  }

  const activeCount = hotTakes.filter((h) => h.is_active).length;
  const inactiveCount = hotTakes.length - activeCount;

  return (
    <BHBLayout coachName={coachName} coachEmail={coachEmail} isAdmin={isAdmin}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between animate-bhb-fade-in">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Hot Takes
            </h1>
            <p className="text-gray-500 mt-1">
              Share ad strategy tips with store owners
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white
                       bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl
                       hover:from-orange-600 hover:to-orange-700 transition-all duration-200
                       shadow-lg shadow-orange-500/25"
          >
            <Plus className="w-5 h-5" />
            New Hot Take
          </button>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-bhb-fade-in"
          style={{ animationDelay: "50ms" }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                }}
              >
                <Flame className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {hotTakes.length}
            </div>
            <div className="text-sm text-gray-500">hot takes</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Active
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-600">
              {activeCount}
            </div>
            <div className="text-sm text-gray-500">visible to stores</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Inactive
              </span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-gray-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-600">
              {inactiveCount}
            </div>
            <div className="text-sm text-gray-500">hidden from stores</div>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div
            className="bg-white rounded-2xl border border-orange-200 p-6 animate-bhb-fade-in"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Create New Hot Take
                </h2>
                <p className="text-sm text-gray-500">
                  Share your latest ad strategy insights
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="E.g., Focus on Mobile-First Creative"
                  value={newHotTake.title}
                  onChange={(e) =>
                    setNewHotTake({ ...newHotTake, title: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl
                             placeholder:text-gray-400 focus:outline-none focus:ring-2
                             focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Content
                </label>
                <textarea
                  id="content"
                  placeholder="Share your tip or strategy here..."
                  value={newHotTake.content}
                  onChange={(e) =>
                    setNewHotTake({ ...newHotTake, content: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl
                             placeholder:text-gray-400 focus:outline-none focus:ring-2
                             focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5
                             text-sm font-medium text-white bg-orange-500 rounded-xl
                             hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4" />
                      Publish Hot Take
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewHotTake({ title: "", content: "" });
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100
                             rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Hot Takes List */}
        <div
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-bhb-fade-in"
          style={{ animationDelay: "150ms" }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              All Hot Takes
            </h2>
            <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {hotTakes.length} total
            </span>
          </div>

          {hotTakes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Flame className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No hot takes yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first hot take to share with store owners
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                           text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100
                           transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Hot Take
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {hotTakes.map((hotTake) => (
                <div
                  key={hotTake.id}
                  className={`p-5 transition-colors ${
                    hotTake.is_active
                      ? "bg-white hover:bg-gray-50/50"
                      : "bg-gray-50/70"
                  }`}
                >
                  {editingId === hotTake.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <input
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/20
                                   focus:border-blue-500 transition-all"
                        placeholder="Title"
                      />
                      <textarea
                        value={editForm.content}
                        onChange={(e) =>
                          setEditForm({ ...editForm, content: e.target.value })
                        }
                        rows={4}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/20
                                   focus:border-blue-500 transition-all resize-none"
                        placeholder="Content"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(hotTake.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                                     text-white bg-emerald-500 rounded-xl hover:bg-emerald-600
                                     transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                                     text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200
                                     transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className={`font-semibold ${
                              hotTake.is_active
                                ? "text-gray-900"
                                : "text-gray-500"
                            }`}
                          >
                            {hotTake.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                              hotTake.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {hotTake.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p
                          className={`text-sm mb-3 ${
                            hotTake.is_active
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {hotTake.content}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(hotTake.published_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            handleToggleActive(hotTake.id, hotTake.is_active)
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                                      rounded-lg transition-colors ${
                                        hotTake.is_active
                                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                      }`}
                        >
                          {hotTake.is_active ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              Inactive
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleStartEdit(hotTake)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50
                                     rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(hotTake.id, hotTake.title)
                          }
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50
                                     rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BHBLayout>
  );
}
