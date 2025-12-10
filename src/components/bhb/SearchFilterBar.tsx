"use client";

import React from "react";
import { Search, X, ChevronDown } from "lucide-react";

interface Coach {
  name: string;
  email: string;
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCoach: string;
  onCoachChange: (value: string) => void;
  coaches: Coach[];
  resultCount?: number;
  totalCount?: number;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  selectedCoach,
  onCoachChange,
  coaches,
  resultCount,
  totalCount,
}: SearchFilterBarProps) {
  const hasFilters = searchQuery.trim() !== "" || selectedCoach !== "all";

  const clearFilters = () => {
    onSearchChange("");
    onCoachChange("all");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                       focus:border-blue-500 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                         hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Coach Filter */}
        <div className="relative min-w-[200px]">
          <select
            value={selectedCoach}
            onChange={(e) => onCoachChange(e.target.value)}
            className="w-full appearance-none pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl
                       bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20
                       focus:border-blue-500 transition-all duration-200 cursor-pointer"
          >
            <option value="all">All Stores</option>
            {coaches.map((coach) => (
              <option key={coach.email} value={coach.email}>
                {coach.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600
                       hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      {resultCount !== undefined && totalCount !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-900">{resultCount}</span> of{" "}
            <span className="font-medium text-gray-900">{totalCount}</span>{" "}
            stores
            {hasFilters && " (filtered)"}
          </p>
        </div>
      )}
    </div>
  );
}
