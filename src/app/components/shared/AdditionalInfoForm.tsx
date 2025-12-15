"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdditionalInfoFormProps {
  mode?: "create" | "enhance";
  fabricMaterial: string;
  setFabricMaterial: (value: string) => void;
  occasionUse: string;
  setOccasionUse: (value: string) => void;
  keyFeatures: string;
  setKeyFeatures: (value: string) => void;
  additionalNotes: string;
  setAdditionalNotes: (value: string) => void;
}

export function AdditionalInfoForm({
  mode = "create",
  fabricMaterial,
  setFabricMaterial,
  occasionUse,
  setOccasionUse,
  keyFeatures,
  setKeyFeatures,
  additionalNotes,
  setAdditionalNotes,
}: AdditionalInfoFormProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fabricMaterial">Fabric/Material Content</Label>
            <Input
              id="fabricMaterial"
              value={fabricMaterial}
              onChange={(e) => setFabricMaterial(e.target.value)}
              placeholder="e.g. 100% organic cotton, stainless steel, recycled plastic"
              autoComplete="off"
            />
            <p className="text-sm text-muted-foreground">
              Describe the materials used in this product
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occasionUse">Occasion Use</Label>
            <Input
              id="occasionUse"
              value={occasionUse}
              onChange={(e) => setOccasionUse(e.target.value)}
              placeholder="e.g. outdoor activities, formal events, everyday use"
              autoComplete="off"
            />
            <p className="text-sm text-muted-foreground">
              When or where would customers use this product?
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features & Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyFeatures">Key Features</Label>
            <Textarea
              id="keyFeatures"
              value={keyFeatures}
              onChange={(e) => setKeyFeatures(e.target.value)}
              placeholder="e.g. waterproof, eco-friendly, machine washable, lifetime warranty"
              rows={3}
              autoComplete="off"
            />
            <p className="text-sm text-muted-foreground">
              List the main features and benefits
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any other important information about this product"
              rows={3}
              autoComplete="off"
            />
            <p className="text-sm text-muted-foreground">
              {mode === "enhance"
                ? "Additional context for the AI to consider"
                : "Optional: Add any special instructions or details"}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
