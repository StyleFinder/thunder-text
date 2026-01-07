/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Image,
  Clock,
  Search,
  DollarSign,
  Zap,
  Check,
} from "lucide-react";

interface AppIntroductionProps {
  onComplete?: () => void;
  showSkip?: boolean;
}

export function AppIntroduction({
  onComplete,
  showSkip = true,
}: AppIntroductionProps) {
  const features = [
    {
      icon: Image,
      title: "Image Analysis",
      description:
        "Upload product photos and our AI analyzes colors, materials, and design details",
    },
    {
      icon: Sparkles,
      title: "AI Generation",
      description:
        "GPT-4 Vision creates compelling, accurate descriptions from your images",
    },
    {
      icon: Search,
      title: "SEO Optimization",
      description:
        "Automatically optimized for search engines to increase organic traffic",
    },
    {
      icon: Clock,
      title: "Save Time",
      description:
        "Generate descriptions in seconds instead of writing for hours",
    },
    {
      icon: DollarSign,
      title: "Boost Sales",
      description:
        "Better product descriptions lead to higher conversion rates",
    },
    {
      icon: Zap,
      title: "Bulk Processing",
      description:
        "Handle multiple products at once with our batch processing feature",
    },
  ];

  const benefits = [
    "Reduce product listing time by 90%",
    "Improve SEO rankings with optimized content",
    "Maintain consistent brand voice",
    "Increase conversion rates with better descriptions",
    "Scale your catalog effortlessly",
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex items-center justify-center p-3 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold">Welcome to Thunder Text</h1>
              <p className="text-muted-foreground">
                Generate SEO-optimized product descriptions from images.
                AI-powered content can boost conversions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Thunder Text Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Badge variant="default" className="mt-1">
              1
            </Badge>
            <div className="space-y-1 flex-1">
              <p className="font-semibold">Upload Product Images</p>
              <p className="text-sm text-muted-foreground">
                Add photos of your products - the AI will analyze visual details
                like colors, materials, and design
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge variant="default" className="mt-1">
              2
            </Badge>
            <div className="space-y-1 flex-1">
              <p className="font-semibold">AI Analyzes & Generates</p>
              <p className="text-sm text-muted-foreground">
                GPT-4 Vision examines your images and creates detailed, engaging
                descriptions
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge variant="default" className="mt-1">
              3
            </Badge>
            <div className="space-y-1 flex-1">
              <p className="font-semibold">Review & Publish</p>
              <p className="text-sm text-muted-foreground">
                Review the generated content, make any edits, and publish
                directly to your products
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Features Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Powerful Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Why Choose Thunder Text?</CardTitle>
            <Badge variant="default" className="bg-green-600">
              Trusted by 500+ Stores
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Quick Start CTA */}
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                Ready to Transform Your Product Descriptions?
              </h2>
              <p className="text-muted-foreground">
                Start generating professional product content in seconds. No
                credit card required for your first 10 products.
              </p>
            </div>

            <div className="flex gap-3">
              <Button size="lg" onClick={onComplete}>
                Get Started
              </Button>
              {showSkip && (
                <Button size="lg" variant="outline" onClick={onComplete}>
                  Skip Introduction
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Story */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Success Story</CardTitle>
        </CardHeader>
        <CardContent className="text-green-900 space-y-2">
          <p>
            "Thunder Text reduced our product listing time by 85% and increased
            our organic traffic by 40% in just 2 months. The AI-generated
            descriptions are incredibly accurate and convert better than our
            manually written ones."
          </p>
          <p className="font-semibold">- Sarah Chen, Fashion Boutique Owner</p>
        </CardContent>
      </Card>
    </div>
  );
}
