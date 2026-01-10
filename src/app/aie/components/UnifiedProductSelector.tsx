"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import {
  Search,
  Package,
  Loader2,
  X,
  Check,
  Link,
  ImagePlus,
} from "lucide-react";
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

type TabType = "shopify" | "url";

interface UnifiedProductSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // Shopify products
  products: ShopifyProduct[];
  selectedProducts: ShopifyProduct[];
  loadingProducts: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onProductSelect: (product: ShopifyProduct) => void;
  // Custom URL
  selectedImageUrls: string[];
  onImageUrlAdd: (url: string) => void;
  // Common
  onDone: () => void;
}

export function UnifiedProductSelector({
  isOpen,
  onOpenChange,
  products,
  selectedProducts,
  loadingProducts,
  searchQuery,
  onSearchChange,
  onProductSelect,
  selectedImageUrls,
  onImageUrlAdd,
  onDone,
}: UnifiedProductSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>("shopify");
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    onSearchChange("");
    setTempImageUrl("");
    setImageError(false);
  };

  const handleAddImageUrl = () => {
    if (tempImageUrl.trim()) {
      onImageUrlAdd(tempImageUrl.trim());
      setTempImageUrl("");
      setImageError(false);
    }
  };

  const totalSelected = selectedProducts.length + selectedImageUrls.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] rounded-xl p-0 overflow-hidden flex flex-col">
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
              <ImagePlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Add Products & Images
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Select from your Shopify store or add custom image URLs
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("shopify")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "shopify"
                  ? "bg-white text-blue-600 border border-gray-200 border-b-white -mb-px"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Package className="w-4 h-4" />
              Shopify Products
              {selectedProducts.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {selectedProducts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("url")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "url"
                  ? "bg-white text-blue-600 border border-gray-200 border-b-white -mb-px"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Link className="w-4 h-4" />
              Custom Image URL
              {selectedImageUrls.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {selectedImageUrls.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === "shopify" ? (
            <div className="p-6 flex flex-col gap-5">
              {/* Search */}
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

              {/* Loading State */}
              {loadingProducts && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <p className="text-sm text-gray-500">Loading products...</p>
                </div>
              )}

              {/* Empty State */}
              {!loadingProducts && products.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  {searchQuery
                    ? "No products found"
                    : "Start typing to search products"}
                </p>
              )}

              {/* Product Grid */}
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
          ) : (
            <div className="p-6 flex flex-col gap-5">
              {/* URL Input */}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="image-url"
                  className="text-sm font-medium text-gray-700"
                >
                  Image URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="image-url"
                    value={tempImageUrl}
                    onChange={(e) => {
                      setTempImageUrl(e.target.value);
                      setImageError(false);
                    }}
                    placeholder="https://example.com/product-image.jpg"
                    autoFocus
                    className="h-11 border-gray-200 flex-1"
                  />
                  <Button
                    onClick={handleAddImageUrl}
                    disabled={!tempImageUrl.trim()}
                    style={{
                      background: !tempImageUrl.trim()
                        ? "#9ca3af"
                        : "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                      border: "none",
                    }}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Enter a direct URL to your product image (PNG, JPG, WebP)
                </p>
              </div>

              {/* Preview */}
              {tempImageUrl && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-gray-700">Preview</p>
                  <div className="relative w-40 h-40 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={tempImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                    />
                    {imageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                        <p className="text-xs text-red-500 text-center px-2">
                          Failed to load image
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Added URLs */}
              {selectedImageUrls.length > 0 && (
                <div className="flex flex-col gap-3 mt-4">
                  <p className="text-sm font-medium text-gray-700">
                    Added Images ({selectedImageUrls.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedImageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200"
                      >
                        <img
                          src={url}
                          alt={`Added image ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state for URL tab */}
              {selectedImageUrls.length === 0 && !tempImageUrl && (
                <div className="text-center py-8">
                  <Link className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    No custom images added yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Paste an image URL above to add it
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {totalSelected > 0 ? (
              <span className="font-medium text-blue-600">
                {totalSelected} item{totalSelected !== 1 ? "s" : ""} selected
              </span>
            ) : (
              <span className="text-gray-400">No items selected</span>
            )}
          </div>
          <div className="flex gap-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
