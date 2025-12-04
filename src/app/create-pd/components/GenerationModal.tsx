"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface GenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
}

export function GenerationModal({
  open,
  onOpenChange,
  progress,
}: GenerationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      )}
      <DialogContent
        className="max-w-md"
        style={{
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          zIndex: 51,
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-center"
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#003366",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Creating Your Product Description
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 items-center py-6">
          <div className="w-full">
            <Progress value={progress} className="h-3" />
          </div>

          <div className="flex flex-col gap-2 items-center text-center">
            <p
              className="text-base text-gray-500"
              style={{
                fontSize: "14px",
                color: "#6b7280",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              A work of art is in progress...
            </p>
            <p className="text-sm text-gray-900">
              Our AI is analyzing your images and crafting the perfect
              description.
            </p>
            <p className="text-xs text-gray-500">
              This typically takes 10-15 seconds.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
