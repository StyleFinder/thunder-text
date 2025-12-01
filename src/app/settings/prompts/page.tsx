"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  updated_at: string;
  store_id: string;
}

function PromptsSettingsContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop") || "test-store";
  const { toast } = useToast();

  // State
  const [systemPrompt, setSystemPrompt] = useState<SystemPrompt | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // System prompt editing
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false);
  const [systemPromptContent, setSystemPromptContent] = useState("");

  // Template selection and editing
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateContent, setEditingTemplateContent] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  // Get selected template
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Load prompts
  useEffect(() => {
    async function loadPrompts() {
      try {
        setLoading(true);
        const response = await fetch(`/api/prompts?store_id=${shop}`);

        if (!response.ok) {
          throw new Error("Failed to load prompts");
        }

        const data = await response.json();
        setSystemPrompt(data.system_prompt);
        setTemplates(data.category_templates || []);

        if (data.system_prompt) {
          setSystemPromptContent(data.system_prompt.content);
        }

        // Auto-select first template or default template
        if (data.category_templates && data.category_templates.length > 0) {
          const defaultTemplate = data.category_templates.find(
            (t: Template) => t.is_default,
          );
          const firstTemplate = defaultTemplate || data.category_templates[0];
          setSelectedTemplateId(firstTemplate.id);
        }
      } catch (err) {
        console.error("Error loading prompts:", err);
        setError("Failed to load prompts");
      } finally {
        setLoading(false);
      }
    }

    loadPrompts();
  }, [shop]);

  // Update editing fields when template selection changes
  useEffect(() => {
    if (selectedTemplate && !editingTemplate) {
      setEditingTemplateName(selectedTemplate.name);
      setEditingTemplateContent(selectedTemplate.content);
    }
  }, [selectedTemplateId, selectedTemplate, editingTemplate]);

  // Save system prompt
  const handleSaveSystemPrompt = async () => {
    if (!systemPromptContent.trim()) return;

    try {
      setSaving(true);
      const response = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: shop,
          type: "system_prompt",
          content: systemPromptContent,
          name: "Custom System Prompt",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save system prompt");
      }

      const result = await response.json();
      setSystemPrompt(result.data);
      setEditingSystemPrompt(false);
      setSuccess("System prompt saved successfully!");
      toast({
        title: "Success",
        description: "System prompt saved successfully!",
      });
    } catch (err) {
      console.error("Error saving system prompt:", err);
      setError("Failed to save system prompt");
    } finally {
      setSaving(false);
    }
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (
      !selectedTemplateId ||
      !editingTemplateName.trim() ||
      !editingTemplateContent.trim()
    )
      return;

    try {
      setSaving(true);
      const response = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: shop,
          type: "category_template",
          template_id: selectedTemplateId,
          name: editingTemplateName,
          content: editingTemplateContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save template");
      }

      const result = await response.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedTemplateId ? result.data : t)),
      );

      setEditingTemplate(false);
      setSuccess("Template saved successfully!");
      toast({
        title: "Success",
        description: "Template saved successfully!",
      });
    } catch (err) {
      console.error("Error saving template:", err);
      setError("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // Create new template
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      setError("Please provide both a name and content for the template");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: shop,
          type: "category_template",
          name: newTemplateName,
          content: newTemplateContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create template");
      }

      const result = await response.json();
      setTemplates((prev) => [...prev, result.data]);
      setSelectedTemplateId(result.data.id);
      setShowCreateModal(false);
      setNewTemplateName("");
      setNewTemplateContent("");
      setSuccess("Template created successfully!");
      toast({
        title: "Success",
        description: "Template created successfully!",
      });
    } catch (err) {
      console.error("Error creating template:", err);
      setError("Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;

    try {
      setSaving(true);
      const response = await fetch("/api/prompts/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: shop,
          template_id: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      const remainingTemplates = templates.filter(
        (t) => t.id !== selectedTemplateId,
      );
      setTemplates(remainingTemplates);

      // Select first remaining template
      if (remainingTemplates.length > 0) {
        setSelectedTemplateId(remainingTemplates[0].id);
      } else {
        setSelectedTemplateId("");
      }

      setShowDeleteModal(false);
      setSuccess("Template deleted successfully!");
      toast({
        title: "Success",
        description: "Template deleted successfully!",
      });
    } catch (err) {
      console.error("Error deleting template:", err);
      setError("Failed to delete template");
    } finally {
      setSaving(false);
    }
  };

  // Set default template
  const handleSetDefault = async () => {
    if (!selectedTemplateId) return;

    try {
      setSaving(true);
      const response = await fetch("/api/prompts/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: shop,
          template_id: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set as default");
      }

      setTemplates((prev) =>
        prev.map((t) => ({
          ...t,
          is_default: t.id === selectedTemplateId,
        })),
      );

      setSuccess("Default template updated!");
      toast({
        title: "Success",
        description: "Default template updated!",
      });
    } catch (err) {
      console.error("Error setting default:", err);
      setError("Failed to set template as default");
    } finally {
      setSaving(false);
    }
  };

  const handleResetSystemPrompt = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/prompts/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: shop,
          type: "system_prompt",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset system prompt");
      }

      const result = await response.json();
      setSystemPrompt(result.data);
      setSystemPromptContent(result.data.content);
      setEditingSystemPrompt(false);
      setSuccess("System prompt reset to default!");
      toast({
        title: "Success",
        description: "System prompt reset to default!",
      });
    } catch (err) {
      console.error("Error resetting system prompt:", err);
      setError("Failed to reset system prompt");
    } finally {
      setSaving(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!selectedTemplateId) return;

    if (
      !confirm(
        "Are you sure you want to restore this template to default? Your current customizations will be lost.",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/prompts/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: shop,
          type: "category_template",
          template_id: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset template");
      }

      const result = await response.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedTemplateId ? result.data : t)),
      );
      setEditingTemplateName(result.data.name);
      setEditingTemplateContent(result.data.content);
      setEditingTemplate(false);
      setSuccess("Template restored to default!");
      toast({
        title: "Success",
        description: "Template restored to default!",
      });
    } catch (err) {
      console.error("Error resetting template:", err);
      setError("Failed to reset template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          background: "#fafaf9",
          minHeight: "100vh",
          padding: "32px 16px",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#003366",
              marginBottom: "24px",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Prompt Settings
          </h1>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              padding: "48px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Loader2
                className="h-6 w-6 animate-spin"
                style={{ color: "#0066cc" }}
              />
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Loading prompts...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fafaf9",
        minHeight: "100vh",
        padding: "32px 16px",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#003366",
            marginBottom: "24px",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Prompt Settings
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {error && (
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <AlertCircle
                className="h-5 w-5"
                style={{ color: "#dc2626", marginTop: "2px", flexShrink: 0 }}
              />
              <p
                style={{
                  fontSize: "14px",
                  color: "#b91c1c",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {error}
              </p>
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <CheckCircle
                className="h-5 w-5"
                style={{ color: "#16a34a", marginTop: "2px", flexShrink: 0 }}
              />
              <p
                style={{
                  fontSize: "14px",
                  color: "#15803d",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {success}
              </p>
            </div>
          )}

          {/* Templates Section */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#003366",
                    marginBottom: "4px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Product Description Templates
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Create and manage custom templates for different product types
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: "#0066cc",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#0052a3";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#0066cc";
                }}
              >
                Create New Template
              </button>
            </div>
            <div style={{ padding: "24px" }}>
              {templates.length === 0 ? (
                <div style={{ padding: "48px 0", textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      margin: 0,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    No templates created yet. Click &quot;Create New
                    Template&quot; to get started.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {/* Template Dropdown Selector */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <label
                      htmlFor="template-select"
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#003366",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Select Template to Edit
                    </label>
                    <select
                      id="template-select"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "14px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        outline: "none",
                        background: "#ffffff",
                        color: "#003366",
                        cursor: "pointer",
                      }}
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.is_default ? " (Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTemplate && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      {/* Template Name */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <label
                          htmlFor="template-name"
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#003366",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          Template Name
                        </label>
                        <input
                          id="template-name"
                          type="text"
                          value={editingTemplateName}
                          onChange={(e) =>
                            setEditingTemplateName(e.target.value)
                          }
                          disabled={!editingTemplate}
                          style={{
                            width: "100%",
                            padding: "12px",
                            fontSize: "14px",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            outline: "none",
                            background: editingTemplate ? "#ffffff" : "#f9fafb",
                            color: "#003366",
                            cursor: editingTemplate ? "text" : "not-allowed",
                          }}
                        />
                      </div>

                      {/* Template Content */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <label
                          htmlFor="template-content"
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#003366",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          Template Content
                        </label>
                        <textarea
                          id="template-content"
                          value={editingTemplateContent}
                          onChange={(e) =>
                            setEditingTemplateContent(e.target.value)
                          }
                          rows={12}
                          disabled={!editingTemplate}
                          style={{
                            width: "100%",
                            padding: "12px",
                            fontSize: "14px",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            outline: "none",
                            background: editingTemplate ? "#ffffff" : "#f9fafb",
                            color: "#003366",
                            cursor: editingTemplate ? "text" : "not-allowed",
                            resize: "vertical",
                          }}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "12px",
                        }}
                      >
                        {editingTemplate ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingTemplate(false);
                                setEditingTemplateName(selectedTemplate.name);
                                setEditingTemplateContent(
                                  selectedTemplate.content,
                                );
                              }}
                              style={{
                                background: "transparent",
                                color: "#003366",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "12px 24px",
                                fontSize: "14px",
                                fontWeight: 600,
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f9fafb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveTemplate}
                              disabled={saving}
                              style={{
                                background: saving ? "#93c5fd" : "#0066cc",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px 24px",
                                fontSize: "14px",
                                fontWeight: 600,
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                cursor: saving ? "not-allowed" : "pointer",
                                transition: "background 0.15s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                              onMouseEnter={(e) => {
                                if (!saving)
                                  e.currentTarget.style.background = "#0052a3";
                              }}
                              onMouseLeave={(e) => {
                                if (!saving)
                                  e.currentTarget.style.background = "#0066cc";
                              }}
                            >
                              {saving && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                              Save Template
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setShowDeleteModal(true)}
                              style={{
                                background: "#dc2626",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px 24px",
                                fontSize: "14px",
                                fontWeight: 600,
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                cursor: "pointer",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#b91c1c";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#dc2626";
                              }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={handleResetTemplate}
                              disabled={saving}
                              style={{
                                background: "transparent",
                                color: "#003366",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "12px 24px",
                                fontSize: "14px",
                                fontWeight: 600,
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                cursor: saving ? "not-allowed" : "pointer",
                                transition: "all 0.15s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                              onMouseEnter={(e) => {
                                if (!saving)
                                  e.currentTarget.style.background = "#f9fafb";
                              }}
                              onMouseLeave={(e) => {
                                if (!saving)
                                  e.currentTarget.style.background =
                                    "transparent";
                              }}
                            >
                              {saving && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                              Restore to Default
                            </button>
                            {!selectedTemplate.is_default && (
                              <button
                                onClick={handleSetDefault}
                                disabled={saving}
                                style={{
                                  background: "transparent",
                                  color: "#003366",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  padding: "12px 24px",
                                  fontSize: "14px",
                                  fontWeight: 600,
                                  fontFamily:
                                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                  cursor: saving ? "not-allowed" : "pointer",
                                  transition: "all 0.15s ease",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                                onMouseEnter={(e) => {
                                  if (!saving)
                                    e.currentTarget.style.background =
                                      "#f9fafb";
                                }}
                                onMouseLeave={(e) => {
                                  if (!saving)
                                    e.currentTarget.style.background =
                                      "transparent";
                                }}
                              >
                                {saving && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Set as Default
                              </button>
                            )}
                            <button
                              onClick={() => setEditingTemplate(true)}
                              style={{
                                background: "#0066cc",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px 24px",
                                fontSize: "14px",
                                fontWeight: 600,
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                cursor: "pointer",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#0052a3";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#0066cc";
                              }}
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* System Prompt Section */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#003366",
                    marginBottom: "4px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Master System Prompt
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Universal copywriting principles applied to all product
                  descriptions
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                {editingSystemPrompt && (
                  <button
                    onClick={handleResetSystemPrompt}
                    disabled={saving}
                    style={{
                      background: "transparent",
                      color: "#003366",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      cursor: saving ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) e.currentTarget.style.background = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      if (!saving)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Restore to Default
                  </button>
                )}
                <button
                  onClick={() => {
                    if (editingSystemPrompt) {
                      handleSaveSystemPrompt();
                    } else {
                      setEditingSystemPrompt(true);
                    }
                  }}
                  disabled={saving && editingSystemPrompt}
                  style={{
                    background:
                      saving && editingSystemPrompt ? "#93c5fd" : "#0066cc",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    cursor:
                      saving && editingSystemPrompt ? "not-allowed" : "pointer",
                    transition: "background 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    if (!(saving && editingSystemPrompt))
                      e.currentTarget.style.background = "#0052a3";
                  }}
                  onMouseLeave={(e) => {
                    if (!(saving && editingSystemPrompt))
                      e.currentTarget.style.background = "#0066cc";
                  }}
                >
                  {saving && editingSystemPrompt && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingSystemPrompt ? "Save" : "Edit"}
                </button>
              </div>
            </div>
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <textarea
                  value={systemPromptContent}
                  onChange={(e) => setSystemPromptContent(e.target.value)}
                  rows={10}
                  disabled={!editingSystemPrompt}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    outline: "none",
                    background: editingSystemPrompt ? "#ffffff" : "#f9fafb",
                    color: "#003366",
                    cursor: editingSystemPrompt ? "text" : "not-allowed",
                    resize: "vertical",
                  }}
                />

                {editingSystemPrompt && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => {
                        setEditingSystemPrompt(false);
                        setSystemPromptContent(systemPrompt?.content || "");
                      }}
                      style={{
                        background: "transparent",
                        color: "#003366",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: 600,
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "16px",
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
              maxWidth: "600px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#003366",
                  marginBottom: "4px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Create New Template
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Define the structure and style for this type of product
              </p>
            </div>
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="new-template-name"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#003366",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Template Name
                  </label>
                  <input
                    id="new-template-name"
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Summer Dresses, Casual Jewelry, Formal Wear"
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      outline: "none",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="new-template-content"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#003366",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Template Content
                  </label>
                  <textarea
                    id="new-template-content"
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    rows={8}
                    placeholder="Enter your template instructions here..."
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                padding: "24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTemplateName("");
                  setNewTemplateContent("");
                }}
                style={{
                  background: "transparent",
                  color: "#003366",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={saving}
                style={{
                  background: saving ? "#93c5fd" : "#0066cc",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.background = "#0052a3";
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.background = "#0066cc";
                }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "16px",
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
              maxWidth: "500px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#003366",
                  marginBottom: "4px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Delete Template
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Are you sure you want to delete &quot;{selectedTemplate?.name}
                &quot;? This action cannot be undone.
              </p>
            </div>
            <div
              style={{
                padding: "24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: "transparent",
                  color: "#003366",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTemplate}
                disabled={saving}
                style={{
                  background: saving ? "#fca5a5" : "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.background = "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.background = "#dc2626";
                }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PromptsSettingsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            background: "#fafaf9",
            minHeight: "100vh",
            padding: "32px 16px",
          }}
        >
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#003366",
                marginBottom: "24px",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Prompt Settings
            </h1>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                padding: "48px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Loader2
                  className="h-6 w-6 animate-spin"
                  style={{ color: "#0066cc" }}
                />
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Loading...
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <PromptsSettingsContent />
    </Suspense>
  );
}
