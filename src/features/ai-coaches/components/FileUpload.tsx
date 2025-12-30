"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Paperclip,
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  UploadedFile,
  SUPPORTED_FILE_TYPES,
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  SupportedMimeType,
  FileCategory,
} from "@/types/ai-coaches";

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  shopDomain: string;
}

const FILE_CATEGORY_ICONS: Record<FileCategory | "unknown", typeof FileText> = {
  document: FileText,
  spreadsheet: FileSpreadsheet,
  image: ImageIcon,
  text: FileText,
  unknown: File,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileCategory(mimeType: string): FileCategory | "unknown" {
  const fileType = SUPPORTED_FILE_TYPES[mimeType as SupportedMimeType];
  return fileType?.category || "unknown";
}

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const fileType = SUPPORTED_FILE_TYPES[file.type as SupportedMimeType];
  if (!fileType) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ACCEPTED_FILE_EXTENSIONS.join(", ");
    return {
      valid: false,
      error: `Unsupported file type: .${extension}. Accepted: ${validExtensions}`,
    };
  }

  // Check file size
  if (file.size > fileType.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size for ${fileType.extension} is ${formatFileSize(fileType.maxSize)}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  return { valid: true };
}

export function FileUpload({
  files,
  onFilesChange,
  disabled,
  shopDomain,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      // Check max files limit
      if (files.length + fileArray.length > MAX_FILES_PER_MESSAGE) {
        alert(`Maximum ${MAX_FILES_PER_MESSAGE} files per message`);
        return;
      }

      const uploadedFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        const validation = validateFile(file);
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (!validation.valid) {
          uploadedFiles.push({
            file,
            id,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            status: "error",
            progress: 0,
            error: validation.error,
          });
          continue;
        }

        // Add file as pending
        uploadedFiles.push({
          file,
          id,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          status: "pending",
          progress: 0,
        });
      }

      onFilesChange([...files, ...uploadedFiles]);

      // Upload files that are valid
      for (const uploadedFile of uploadedFiles) {
        if (uploadedFile.status === "pending") {
          await uploadFile(uploadedFile.id);
        }
      }
    },
    // Note: uploadFile is intentionally not in deps - we want stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, onFilesChange],
  );

  /* eslint-disable security/detect-object-injection */
  const uploadFile = async (fileId: string) => {
    const fileIndex = files.findIndex((f) => f.id === fileId);
    if (fileIndex === -1) return;

    const uploadedFile = files[fileIndex];

    // Update status to uploading
    const updatedFiles = [...files];
    updatedFiles[fileIndex] = {
      ...uploadedFile,
      status: "uploading",
      progress: 0,
    };
    onFilesChange(updatedFiles);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile.file);

      const response = await fetch("/api/ai-coaches/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      // Update with attachment data
      const currentFiles = [...files];
      const currentIndex = currentFiles.findIndex((f) => f.id === fileId);
      if (currentIndex !== -1) {
        currentFiles[currentIndex] = {
          ...currentFiles[currentIndex],
          status: "ready",
          progress: 100,
          attachment: data.data.attachment,
        };
        onFilesChange(currentFiles);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      const currentFiles = [...files];
      const currentIndex = currentFiles.findIndex((f) => f.id === fileId);
      if (currentIndex !== -1) {
        currentFiles[currentIndex] = {
          ...currentFiles[currentIndex],
          status: "error",
          error: errorMessage,
        };
        onFilesChange(currentFiles);
      }
    }
  };
  /* eslint-enable security/detect-object-injection */

  const _removeFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ""; // Reset input
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
        onChange={handleInputChange}
        style={{ display: "none" }}
      />

      {/* Attachment button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={disabled || files.length >= MAX_FILES_PER_MESSAGE}
        style={{
          padding: "8px",
          color: files.length > 0 ? "#0066cc" : "#6b7280",
        }}
        title={`Attach files (${files.length}/${MAX_FILES_PER_MESSAGE})`}
      >
        <Paperclip className="h-5 w-5" />
        {files.length > 0 && (
          <span
            style={{
              marginLeft: "4px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {files.length}
          </span>
        )}
      </Button>

      {/* Drop zone overlay (shown when dragging) */}
      {isDragOver && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 102, 204, 0.1)",
            border: "2px dashed #0066cc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "32px 48px",
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            <Upload
              className="h-12 w-12 mx-auto mb-4"
              style={{ color: "#0066cc" }}
            />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#003366" }}>
              Drop files here
            </p>
            <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
              PDF, Word, CSV, Excel, Images, Text
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// Separate component for displaying file list
export function FileList({
  files,
  onRemove,
}: {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "12px",
      }}
    >
      {files.map((file) => {
        const category = getFileCategory(file.mimeType);
        // eslint-disable-next-line security/detect-object-injection
        const IconComponent = FILE_CATEGORY_ICONS[category];

        return (
          <div
            key={file.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              background: file.status === "error" ? "#fef2f2" : "#f3f4f6",
              border: `1px solid ${file.status === "error" ? "#fecaca" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "13px",
            }}
          >
            <IconComponent
              className="h-4 w-4"
              style={{
                color: file.status === "error" ? "#991b1b" : "#6b7280",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: file.status === "error" ? "#991b1b" : "#374151",
                maxWidth: "150px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={file.name}
            >
              {file.name}
            </span>
            <span style={{ color: "#9ca3af", fontSize: "12px" }}>
              {formatFileSize(file.size)}
            </span>

            {/* Status indicator */}
            {file.status === "uploading" && (
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: "#0066cc" }}
              />
            )}
            {file.status === "processing" && (
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: "#f59e0b" }}
              />
            )}
            {file.status === "ready" && (
              <CheckCircle className="h-4 w-4" style={{ color: "#16a34a" }} />
            )}
            {file.status === "error" && (
              <span title={file.error}>
                <AlertCircle className="h-4 w-4" style={{ color: "#991b1b" }} />
              </span>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              style={{
                padding: "2px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Remove file"
            >
              <X className="h-4 w-4" style={{ color: "#6b7280" }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
