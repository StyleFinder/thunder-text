"use client";

import { Loader2, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GenerationProgressProps {
  isOpen: boolean;
  progress: number;
}

const GENERATION_PHASES = [
  { step: 1, label: "Preparing request", threshold: 10 },
  { step: 2, label: "Retrieving best practices", threshold: 30 },
  { step: 3, label: "Analyzing product data", threshold: 50 },
  { step: 4, label: "Generating ad variants", threshold: 70 },
  { step: 5, label: "Finalizing results", threshold: 90 },
];

export function GenerationProgress({
  isOpen,
  progress,
}: GenerationProgressProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
              }}
            >
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <DialogTitle className="text-gray-900 text-lg">
              Generating Ad Variants
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Phase Steps */}
          <div className="space-y-3">
            {GENERATION_PHASES.map((phase) => {
              const isActive =
                progress >= phase.threshold && progress < phase.threshold + 20;
              const isComplete = progress >= phase.threshold + 20;
              return (
                <div key={phase.step} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isComplete
                        ? "bg-green-100 text-green-600"
                        : isActive
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isComplete ? <Check className="w-3 h-3" /> : phase.step}
                  </div>
                  <span
                    className={`text-sm ${
                      isComplete
                        ? "text-green-600 font-medium"
                        : isActive
                          ? "text-blue-600 font-medium"
                          : "text-gray-400"
                    }`}
                  >
                    {phase.label}
                    {isActive && (
                      <span className="ml-2 text-blue-400">...</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <Progress value={progress} className="w-full h-2" />
          <p className="text-xs text-gray-500 text-center">
            This typically takes 10-15 seconds
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
