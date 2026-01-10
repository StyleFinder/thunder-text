/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
"use client";

import { RefreshCw, Loader2 } from "lucide-react";

interface ContentLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "pulse";
  className?: string;
}

export function ContentLoader({
  message = "Loading...",
  size = "md",
  variant = "spinner",
  className = "",
}: ContentLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      {variant === "spinner" ? (
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      ) : (
        <RefreshCw
          className={`${sizeClasses[size]} animate-spin text-primary`}
        />
      )}
      <span className={`${textSizeClasses[size]} text-muted-foreground`}>
        {message}
      </span>
    </div>
  );
}

export function SkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  );
}

export function CardSkeletonLoader() {
  return (
    <div className="rounded-lg border bg-card animate-pulse">
      <div className="p-6 space-y-4">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
