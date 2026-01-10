/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function NotFoundContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-oxford-50 p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-oxford-900">404</h1>
              <h2 className="text-2xl font-semibold text-oxford-800">
                Page Not Found
              </h2>
              <p className="text-sm text-muted-foreground">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => (window.location.href = "/")}>
                Go to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotFoundFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-oxford-50">
      <div className="flex items-center gap-3">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-smart-500"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={<NotFoundFallback />}>
      <NotFoundContent />
    </Suspense>
  );
}
