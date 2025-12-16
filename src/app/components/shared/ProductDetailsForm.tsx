"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type ProductCategory } from "@/lib/prompts-types";

interface ProductDetailsFormProps {
  mode?: "create" | "enhance";
  parentCategory: string;
  setParentCategory: (value: string) => void;
  parentCategoryOptions: { label: string; value: string }[];
  availableSizing: string;
  setAvailableSizing: (value: string) => void;
  sizingOptions: { label: string; value: string }[];
  selectedTemplate: ProductCategory;
  setSelectedTemplate: (value: ProductCategory) => void;
  templatePreview?: {
    name: string;
    description: string;
    sections?: string[];
  };
  setTemplatePreview?: (value: {
    name: string;
    description: string;
    sections?: string[];
  }) => void;
  disabled?: boolean;
  initialData?: {
    parentCategory?: string;
    availableSizing?: string;
    selectedTemplate?: ProductCategory;
  };
}

export function ProductDetailsForm({
  mode = "create",
  parentCategory,
  setParentCategory,
  parentCategoryOptions,
  availableSizing,
  setAvailableSizing,
  sizingOptions,
  selectedTemplate,
  setSelectedTemplate,
  disabled = false,
  initialData,
}: ProductDetailsFormProps) {
  // Apply initial data if in enhance mode
  if (mode === "enhance" && initialData) {
    if (initialData.parentCategory && !parentCategory) {
      setParentCategory(initialData.parentCategory);
    }
    if (initialData.availableSizing && !availableSizing) {
      setAvailableSizing(initialData.availableSizing);
    }
    if (initialData.selectedTemplate && selectedTemplate === "general") {
      setSelectedTemplate(initialData.selectedTemplate);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {mode === "enhance" ? "Enhancement Settings" : "Product Details"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="parent-category">Parent Category</Label>
            <Select
              value={parentCategory}
              onValueChange={setParentCategory}
              disabled={disabled}
            >
              <SelectTrigger id="parent-category">
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                {parentCategoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="available-sizing">Available Sizing</Label>
            <Select
              value={availableSizing}
              onValueChange={setAvailableSizing}
              disabled={disabled}
            >
              <SelectTrigger id="available-sizing">
                <SelectValue placeholder="Select size range" />
              </SelectTrigger>
              <SelectContent>
                {sizingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select the available size range for this product
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="product-template">Product Category Template</Label>
          <Select
            value={selectedTemplate}
            onValueChange={(value) =>
              setSelectedTemplate(value as ProductCategory)
            }
          >
            <SelectTrigger id="product-template">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clothing">Women&apos;s Clothing</SelectItem>
              <SelectItem value="jewelry">Jewelry & Accessories</SelectItem>
              <SelectItem value="home">Home & Living</SelectItem>
              <SelectItem value="beauty">Beauty & Personal Care</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="general">General Products</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose a template that best matches your product type for optimized
            descriptions
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
