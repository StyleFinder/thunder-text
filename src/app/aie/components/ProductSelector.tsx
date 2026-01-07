"use client";

/* eslint-disable @next/next/no-img-element */

import { Search, Package, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ShopifyProduct } from "../types";

interface ProductSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  products: ShopifyProduct[];
  selectedProducts: ShopifyProduct[];
  loadingProducts: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onProductSelect: (product: ShopifyProduct) => void;
  onDone: () => void;
}

export function ProductSelector({
  isOpen,
  onOpenChange,
  products,
  selectedProducts,
  loadingProducts,
  searchQuery,
  onSearchChange,
  onProductSelect,
  onDone,
}: ProductSelectorProps) {
  const handleClose = () => {
    onOpenChange(false);
    onSearchChange("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[80vh] rounded-xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-gray-200 bg-white flex-shrink-0 relative">
          <button
            onClick={handleClose}
            className="absolute right-6 top-5 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
              }}
            >
              <Package className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Add Products
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1 bg-gray-50">
          <div className="flex flex-col gap-2 w-full">
            <Label
              htmlFor="product-search"
              className="text-sm font-medium text-gray-700"
            >
              Search Products
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="product-search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Start typing to search..."
                autoFocus
                className="pl-10 h-11 border-gray-200"
              />
            </div>
          </div>

          {selectedProducts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm text-blue-700 font-medium">
                {selectedProducts.length} product
                {selectedProducts.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          )}

          {loadingProducts && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">Loading products...</p>
            </div>
          )}

          {!loadingProducts && products.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              {searchQuery
                ? "No products found"
                : "Start typing to search products"}
            </p>
          )}

          {!loadingProducts && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const isSelected = selectedProducts.find(
                  (p) => p.id === product.id,
                );
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onProductSelect(product)}
                    className={`text-left bg-white rounded-lg p-3 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-2 border-blue-500 ring-2 ring-blue-100"
                        : "border border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    {product.images[0]?.url && (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-full h-40 object-cover rounded-md"
                      />
                    )}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {product.title}
                      </p>
                      {isSelected && (
                        <span className="inline-flex items-center self-start bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          <Check className="w-3 h-3 mr-1" />
                          Added
                        </span>
                      )}
                      {product.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={onDone}
            style={{
              background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
              border: "none",
            }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
