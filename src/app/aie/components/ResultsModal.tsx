"use client";

/* eslint-disable @next/next/no-img-element */

import { X, Check, LayoutGrid, Columns, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCharacterLimits } from "@/lib/aie/utils/platformConstraints";
import type { AiePlatform } from "@/types/aie";
import type {
  EditableVariant,
  GenerationResult,
  ShopifyProduct,
} from "../types";

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GenerationResult | null;
  editableVariants: EditableVariant[];
  comparisonMode: "grid" | "compare";
  setComparisonMode: (mode: "grid" | "compare") => void;
  selectedForComparison: string[];
  setSelectedForComparison: (ids: string[]) => void;
  selectedProducts: ShopifyProduct[];
  selectedCampaign: string;
  selectedAdAccount: string;
  platform: string;
  onVariantEdit: (
    variantId: string,
    field: "headline" | "primaryText" | "description",
    value: string,
  ) => void;
  onSelectVariant: (variant: EditableVariant, postToFacebook: boolean) => void;
}

function formatScore(score: number): {
  text: string;
  variant: "default" | "secondary" | "outline";
} {
  const percentage = Math.round(score * 10);
  if (score >= 8)
    return { text: `${percentage}% - Excellent`, variant: "default" as const };
  if (score >= 6)
    return { text: `${percentage}% - Good`, variant: "secondary" as const };
  return {
    text: `${percentage}% - Needs Improvement`,
    variant: "outline" as const,
  };
}

export function ResultsModal({
  isOpen,
  onClose,
  result,
  editableVariants,
  comparisonMode,
  setComparisonMode,
  selectedForComparison,
  setSelectedForComparison,
  selectedProducts,
  selectedCampaign,
  selectedAdAccount,
  platform,
  onVariantEdit,
  onSelectVariant,
}: ResultsModalProps) {
  if (!isOpen) return null;

  const limits = getCharacterLimits(platform as AiePlatform);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
      <div className="bg-white rounded-xl w-[90%] max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
            >
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ad Variants Generated
              </h2>
              <p className="text-sm text-gray-500">
                {comparisonMode === "compare"
                  ? "Compare variants side-by-side"
                  : "Select a variant to save to your library"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setComparisonMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  comparisonMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </button>
              <button
                onClick={() => {
                  setComparisonMode("compare");
                  // Auto-select first two variants for comparison if none selected
                  if (
                    selectedForComparison.length < 2 &&
                    editableVariants.length >= 2
                  ) {
                    setSelectedForComparison([
                      editableVariants[0].id,
                      editableVariants[1].id,
                    ]);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  comparisonMode === "compare"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Columns className="w-4 h-4" />
                Compare
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          <div className="space-y-4">
            {result && (
              <Alert className="bg-blue-50 border-blue-200 rounded-lg">
                <AlertDescription className="text-blue-700">
                  Generated {result.variants.length} variants
                  {result.metadata?.generationTimeMs && (
                    <>
                      {" "}
                      in {(result.metadata.generationTimeMs / 1000).toFixed(2)}s
                    </>
                  )}
                  {result.metadata?.aiCost && (
                    <> • AI Cost: ${result.metadata.aiCost.toFixed(4)}</>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Comparison Mode View */}
            {comparisonMode === "compare" && (
              <div className="space-y-4">
                {/* Variant Selector for Comparison */}
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">
                    Select variants to compare:
                  </span>
                  <div className="flex gap-2">
                    {editableVariants.map((variant) => {
                      const isSelected = selectedForComparison.includes(
                        variant.id,
                      );
                      return (
                        <button
                          key={variant.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedForComparison(
                                selectedForComparison.filter(
                                  (id) => id !== variant.id,
                                ),
                              );
                            } else if (selectedForComparison.length < 2) {
                              setSelectedForComparison([
                                ...selectedForComparison,
                                variant.id,
                              ]);
                            } else {
                              setSelectedForComparison([
                                selectedForComparison[1],
                                variant.id,
                              ]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-white border border-gray-200 text-gray-700 hover:border-blue-400"
                          }`}
                        >
                          Variant {variant.variantNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Side-by-Side Comparison Grid */}
                {selectedForComparison.length === 2 && (
                  <div className="grid grid-cols-2 gap-6">
                    {selectedForComparison.map((variantId) => {
                      const variant = editableVariants.find(
                        (v) => v.id === variantId,
                      );
                      if (!variant) return null;
                      const scoreInfo = formatScore(variant.predictedScore);
                      const otherVariant = editableVariants.find(
                        (v) =>
                          v.id ===
                          selectedForComparison.find((id) => id !== variantId),
                      );

                      return (
                        <div
                          key={variant.id}
                          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                        >
                          {/* Variant Header */}
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                Variant {variant.variantNumber}
                              </span>
                              <Badge
                                variant="outline"
                                className="border-gray-300 text-xs"
                              >
                                {variant.variantType}
                              </Badge>
                            </div>
                            <Badge variant={scoreInfo.variant}>
                              {scoreInfo.text}
                            </Badge>
                          </div>

                          {/* Comparison Content */}
                          <div className="p-4 space-y-4">
                            {/* Headline Comparison */}
                            <div>
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Headline
                              </Label>
                              <p
                                className={`mt-1 text-sm text-gray-900 p-2 rounded ${
                                  otherVariant &&
                                  variant.editedHeadline !==
                                    otherVariant.editedHeadline
                                    ? "bg-yellow-50 border border-yellow-200"
                                    : "bg-gray-50"
                                }`}
                              >
                                {variant.editedHeadline || variant.headline}
                              </p>
                            </div>

                            {/* Primary Text Comparison */}
                            <div>
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Ad Copy
                              </Label>
                              <p
                                className={`mt-1 text-sm text-gray-900 p-2 rounded whitespace-pre-wrap ${
                                  otherVariant &&
                                  variant.editedPrimaryText !==
                                    otherVariant.editedPrimaryText
                                    ? "bg-yellow-50 border border-yellow-200"
                                    : "bg-gray-50"
                                }`}
                              >
                                {variant.editedPrimaryText ||
                                  variant.primaryText}
                              </p>
                            </div>

                            {/* Description Comparison */}
                            {variant.description && (
                              <div>
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Description
                                </Label>
                                <p
                                  className={`mt-1 text-sm text-gray-900 p-2 rounded ${
                                    otherVariant &&
                                    variant.editedDescription !==
                                      otherVariant?.editedDescription
                                      ? "bg-yellow-50 border border-yellow-200"
                                      : "bg-gray-50"
                                  }`}
                                >
                                  {variant.editedDescription ||
                                    variant.description}
                                </p>
                              </div>
                            )}

                            {/* CTA */}
                            <div>
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Call-to-Action
                              </Label>
                              <div className="mt-1">
                                <Badge
                                  className={
                                    otherVariant &&
                                    variant.cta !== otherVariant.cta
                                      ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                      : ""
                                  }
                                >
                                  {variant.cta}
                                </Badge>
                              </div>
                            </div>

                            {/* Score Comparison */}
                            {variant.scoreBreakdown && (
                              <div className="pt-2 border-t border-gray-100">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Quality Scores
                                </Label>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  {variant.scoreBreakdown.hook_strength !==
                                    undefined && (
                                    <div
                                      className={`text-center p-2 rounded ${
                                        otherVariant?.scoreBreakdown &&
                                        variant.scoreBreakdown.hook_strength >
                                          otherVariant.scoreBreakdown
                                            .hook_strength
                                          ? "bg-green-50 border border-green-200"
                                          : otherVariant?.scoreBreakdown &&
                                              variant.scoreBreakdown
                                                .hook_strength <
                                                otherVariant.scoreBreakdown
                                                  .hook_strength
                                            ? "bg-red-50 border border-red-200"
                                            : "bg-gray-50"
                                      }`}
                                    >
                                      <p className="text-xs text-gray-500">
                                        Hook
                                      </p>
                                      <p className="text-sm font-semibold">
                                        {(
                                          variant.scoreBreakdown.hook_strength *
                                          100
                                        ).toFixed(0)}
                                        %
                                      </p>
                                    </div>
                                  )}
                                  {variant.scoreBreakdown.cta_clarity !==
                                    undefined && (
                                    <div
                                      className={`text-center p-2 rounded ${
                                        otherVariant?.scoreBreakdown &&
                                        variant.scoreBreakdown.cta_clarity >
                                          otherVariant.scoreBreakdown
                                            .cta_clarity
                                          ? "bg-green-50 border border-green-200"
                                          : otherVariant?.scoreBreakdown &&
                                              variant.scoreBreakdown
                                                .cta_clarity <
                                                otherVariant.scoreBreakdown
                                                  .cta_clarity
                                            ? "bg-red-50 border border-red-200"
                                            : "bg-gray-50"
                                      }`}
                                    >
                                      <p className="text-xs text-gray-500">
                                        CTA
                                      </p>
                                      <p className="text-sm font-semibold">
                                        {(
                                          variant.scoreBreakdown.cta_clarity *
                                          100
                                        ).toFixed(0)}
                                        %
                                      </p>
                                    </div>
                                  )}
                                  {variant.scoreBreakdown
                                    .platform_compliance !== undefined && (
                                    <div
                                      className={`text-center p-2 rounded ${
                                        otherVariant?.scoreBreakdown &&
                                        variant.scoreBreakdown
                                          .platform_compliance >
                                          otherVariant.scoreBreakdown
                                            .platform_compliance
                                          ? "bg-green-50 border border-green-200"
                                          : otherVariant?.scoreBreakdown &&
                                              variant.scoreBreakdown
                                                .platform_compliance <
                                                otherVariant.scoreBreakdown
                                                  .platform_compliance
                                            ? "bg-red-50 border border-red-200"
                                            : "bg-gray-50"
                                      }`}
                                    >
                                      <p className="text-xs text-gray-500">
                                        Platform
                                      </p>
                                      <p className="text-sm font-semibold">
                                        {(
                                          variant.scoreBreakdown
                                            .platform_compliance * 100
                                        ).toFixed(0)}
                                        %
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-3 space-y-2">
                              <Button
                                className="w-full h-9 text-sm font-medium"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                                  border: "none",
                                }}
                                onClick={() => onSelectVariant(variant, false)}
                              >
                                Save to Library
                              </Button>
                              {selectedCampaign && selectedAdAccount && (
                                <Button
                                  className="w-full h-9 text-sm font-medium"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #1877f2 0%, #4267b2 100%)",
                                    border: "none",
                                  }}
                                  onClick={() => onSelectVariant(variant, true)}
                                >
                                  <Facebook className="w-4 h-4 mr-2" />
                                  Post to Facebook
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedForComparison.length < 2 && (
                  <div className="text-center py-12 text-gray-500">
                    <Columns className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>
                      Select two variants above to compare them side-by-side
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Grid Mode View */}
            {comparisonMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {editableVariants.map((variant) => {
                  const scoreInfo = formatScore(variant.predictedScore);

                  return (
                    <Card key={variant.id} className="bg-white border-gray-200">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">
                            Variant {variant.variantNumber}
                          </h3>
                          <Badge variant={scoreInfo.variant}>
                            {scoreInfo.text}
                          </Badge>
                        </div>

                        <Badge variant="outline" className="border-gray-300">
                          {variant.variantType}
                        </Badge>

                        <Separator />

                        {/* Media Section */}
                        {selectedProducts.length > 0 && (
                          <>
                            <div>
                              <p className="text-sm font-semibold mb-2">
                                Media (
                                {
                                  selectedProducts.flatMap((p) => p.images)
                                    .length
                                }{" "}
                                {selectedProducts.flatMap((p) => p.images)
                                  .length === 1
                                  ? "image"
                                  : "images"}
                                )
                              </p>
                              <div
                                className={`grid gap-2 ${
                                  selectedProducts.flatMap((p) => p.images)
                                    .length === 1
                                    ? "grid-cols-1"
                                    : "grid-cols-[repeat(auto-fill,minmax(80px,1fr))]"
                                }`}
                              >
                                {selectedProducts
                                  .flatMap((p) => p.images)
                                  .slice(0, 4)
                                  .map((img, idx) => (
                                    <div
                                      key={idx}
                                      className="relative pb-[100%] bg-gray-100 rounded-lg overflow-hidden"
                                    >
                                      <img
                                        src={img.url}
                                        alt={
                                          img.altText ||
                                          `Product image ${idx + 1}`
                                        }
                                        className="absolute inset-0 w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                {selectedProducts.flatMap((p) => p.images)
                                  .length > 4 && (
                                  <div className="relative pb-[100%] bg-gray-100 rounded-lg flex items-center justify-center">
                                    <p className="text-sm text-gray-600 font-semibold">
                                      +
                                      {selectedProducts.flatMap((p) => p.images)
                                        .length - 4}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {selectedProducts.flatMap((p) => p.images)
                                .length > 1 && (
                                <p className="text-xs text-gray-600 text-center mt-1">
                                  Carousel
                                </p>
                              )}
                            </div>
                            <Separator />
                          </>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor={`headline-${variant.id}`}>
                            Headline
                          </Label>
                          <Textarea
                            id={`headline-${variant.id}`}
                            value={variant.editedHeadline || ""}
                            onChange={(e) =>
                              onVariantEdit(
                                variant.id,
                                "headline",
                                e.target.value,
                              )
                            }
                            rows={2}
                            maxLength={limits.headline.max}
                            className="resize-none"
                          />
                          <p
                            className={`text-xs ${
                              (variant.editedHeadline?.length || 0) >
                              limits.headline.max
                                ? "text-red-500"
                                : "text-gray-500"
                            }`}
                          >
                            {variant.editedHeadline?.length || 0}/
                            {limits.headline.max} characters
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`primary-${variant.id}`}>
                            Ad Copy
                          </Label>
                          <Textarea
                            id={`primary-${variant.id}`}
                            value={variant.editedPrimaryText || ""}
                            onChange={(e) =>
                              onVariantEdit(
                                variant.id,
                                "primaryText",
                                e.target.value,
                              )
                            }
                            rows={3}
                            maxLength={limits.primaryText.max}
                            className="resize-none"
                          />
                          <p
                            className={`text-xs ${
                              (variant.editedPrimaryText?.length || 0) >
                              limits.primaryText.max
                                ? "text-red-500"
                                : "text-gray-500"
                            }`}
                          >
                            {variant.editedPrimaryText?.length || 0}/
                            {limits.primaryText.max} characters
                          </p>
                        </div>

                        {variant.description && (
                          <div className="space-y-2">
                            <Label htmlFor={`desc-${variant.id}`}>
                              Description
                            </Label>
                            <Textarea
                              id={`desc-${variant.id}`}
                              value={variant.editedDescription || ""}
                              onChange={(e) =>
                                onVariantEdit(
                                  variant.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              rows={2}
                              className="resize-none"
                            />
                          </div>
                        )}

                        {variant.cta && (
                          <div>
                            <p className="text-sm font-semibold mb-1">
                              Call-to-Action
                            </p>
                            <Badge>{variant.cta}</Badge>
                          </div>
                        )}

                        <Separator />

                        {variant.scoreBreakdown && (
                          <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700">
                              Quality Scores
                            </p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {variant.scoreBreakdown.hook_strength !==
                                undefined && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-50 text-blue-700"
                                >
                                  Hook:{" "}
                                  {(
                                    variant.scoreBreakdown.hook_strength * 100
                                  ).toFixed(0)}
                                  %
                                </Badge>
                              )}
                              {variant.scoreBreakdown.cta_clarity !==
                                undefined && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-50 text-blue-700"
                                >
                                  CTA:{" "}
                                  {(
                                    variant.scoreBreakdown.cta_clarity * 100
                                  ).toFixed(0)}
                                  %
                                </Badge>
                              )}
                              {variant.scoreBreakdown.platform_compliance !==
                                undefined && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-50 text-blue-700"
                                >
                                  Platform:{" "}
                                  {(
                                    variant.scoreBreakdown.platform_compliance *
                                    100
                                  ).toFixed(0)}
                                  %
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {variant.headlineAlternatives &&
                          variant.headlineAlternatives.length > 0 && (
                            <>
                              <Separator />
                              <div>
                                <p className="text-sm font-semibold mb-1 text-gray-700">
                                  Alternative Headlines
                                </p>
                                <div className="space-y-1">
                                  {variant.headlineAlternatives
                                    .slice(0, 2)
                                    .map((alt, idx) => (
                                      <p
                                        key={idx}
                                        className="text-xs text-gray-500"
                                      >
                                        • {alt}
                                      </p>
                                    ))}
                                </div>
                              </div>
                            </>
                          )}

                        <Separator />

                        <div className="space-y-2">
                          <Button
                            className="w-full h-10 font-medium"
                            style={{
                              background:
                                "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                              border: "none",
                            }}
                            onClick={() => onSelectVariant(variant, false)}
                          >
                            Save to Library
                          </Button>
                          {selectedCampaign && selectedAdAccount && (
                            <Button
                              className="w-full h-10 font-medium"
                              style={{
                                background:
                                  "linear-gradient(135deg, #1877f2 0%, #4267b2 100%)",
                                border: "none",
                              }}
                              onClick={() => onSelectVariant(variant, true)}
                            >
                              <Facebook className="w-4 h-4 mr-2" />
                              Save & Post to Facebook
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
