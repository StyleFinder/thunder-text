"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { logger } from "@/lib/logger";

interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  status: number;
}

interface AdAccountSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adAccounts: AdAccount[];
  shop: string;
  onComplete: () => void;
}

export function AdAccountSelectorModal({
  open,
  onOpenChange,
  adAccounts,
  shop,
  onComplete,
}: AdAccountSelectorModalProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle selection of an ad account
  function toggleAccount(accountId: string) {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }

  // Select all accounts
  function selectAll() {
    setSelectedAccounts(new Set(adAccounts.map((acc) => acc.id)));
  }

  // Clear all selections
  function clearAll() {
    setSelectedAccounts(new Set());
  }

  // Save the selected ad accounts
  async function handleSave() {
    if (selectedAccounts.size === 0) {
      setError("Please select at least one ad account");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/facebook/ad-accounts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          selected_account_ids: Array.from(selectedAccounts),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save ad account selection");
      }

      // Close modal and notify parent
      onOpenChange(false);
      onComplete();
    } catch (err) {
      logger.error("Error saving ad account selection:", err as Error, {
        component: "ad-account-selector",
      });
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // Get status badge for ad account
  function getStatusBadge(status: number) {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Disabled
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            Unsettled
          </span>
        );
      case 101:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Pending Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            Unknown
          </span>
        );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Ad Accounts</DialogTitle>
          <DialogDescription>
            Choose which Meta ad accounts you want to use with ThunderText. You
            can select multiple accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Quick actions */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {selectedAccounts.size} of {adAccounts.length} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={saving}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={saving}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Ad accounts list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {adAccounts.map((account) => {
              const isSelected = selectedAccounts.has(account.id);
              const isActive = account.status === 1;

              return (
                <div
                  key={account.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  } ${!isActive ? "opacity-60" : ""}`}
                  onClick={() => toggleAccount(account.id)}
                >
                  <Checkbox
                    id={account.id}
                    checked={isSelected}
                    onCheckedChange={() => toggleAccount(account.id)}
                    disabled={saving}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={account.id}
                      className="font-medium text-gray-900 cursor-pointer block truncate"
                    >
                      {account.name}
                    </Label>
                    <p className="text-xs text-gray-500 truncate">
                      ID: {account.account_id}
                    </p>
                  </div>
                  {getStatusBadge(account.status)}
                </div>
              );
            })}
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Info message for inactive accounts */}
          {adAccounts.some((acc) => acc.status !== 1) && (
            <p className="mt-4 text-xs text-gray-500">
              Note: Some accounts may be disabled or pending review. You can
              still select them, but they may not work for running ads.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedAccounts.size === 0 || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              `Save Selection (${selectedAccounts.size})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
