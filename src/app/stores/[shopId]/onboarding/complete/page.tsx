"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
  MessageSquare,
  User,
  Rocket,
} from "lucide-react";
import { useShop } from "@/hooks/useShop";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { shopId } = useShop();
  const { progress, markOnboardingComplete } = useOnboardingProgress();

  // Mark onboarding as complete when this page loads
  useEffect(() => {
    if (progress && !progress.onboardingCompleted) {
      markOnboardingComplete();
    }
  }, [progress, markOnboardingComplete]);

  const handleGoToContentCenter = () => {
    router.push(`/stores/${shopId}/content-center`);
  };

  const handleGoToDashboard = () => {
    router.push(`/stores/${shopId}/dashboard`);
  };

  const completedItems = [
    {
      icon: User,
      title: "Shop Profile",
      description: "Business info captured",
      completed: progress?.shopProfileCompleted,
    },
    {
      icon: Sparkles,
      title: "Brand Voice",
      description: "Writing style analyzed",
      completed: progress?.voiceProfileCompleted,
    },
    {
      icon: MessageSquare,
      title: "Business Interview",
      description: "Business profile created",
      completed: progress?.businessProfileCompleted,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl">You&apos;re All Set! 🎉</CardTitle>
          <CardDescription className="text-lg mt-2">
            Your Thunder Text account is ready to create amazing content
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Completed Items */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Setup Complete</CardTitle>
          <CardDescription>
            Here&apos;s what we&apos;ve configured for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completedItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Icon className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800">{item.title}</h4>
                    <p className="text-sm text-green-600">{item.description}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* What You Can Do Now */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600" />
            What You Can Do Now
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-medium text-blue-800 mb-1">
                Generate Product Descriptions
              </h4>
              <p className="text-sm text-blue-600">
                Create compelling product descriptions that match your brand voice
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600 mb-2" />
              <h4 className="font-medium text-purple-800 mb-1">
                Write Blog Posts
              </h4>
              <p className="text-sm text-purple-600">
                Generate SEO-optimized blog content for your store
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <MessageSquare className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="font-medium text-orange-800 mb-1">
                Create Ad Copy
              </h4>
              <p className="text-sm text-orange-600">
                Generate high-converting ad copy for your campaigns
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <User className="h-6 w-6 text-green-600 mb-2" />
              <h4 className="font-medium text-green-800 mb-1">
                Manage Alt Text
              </h4>
              <p className="text-sm text-green-600">
                Generate and manage product image alt text at scale
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleGoToContentCenter}
          size="lg"
          className="flex-1"
        >
          Go to Content Center
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          onClick={handleGoToDashboard}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          Go to Dashboard
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-center text-sm text-gray-500">
        Need help? Check out our{" "}
        <button
          onClick={() => window.open("https://help.thundertext.com", "_blank")}
          className="text-blue-600 hover:underline"
        >
          Help Center
        </button>{" "}
        or contact support.
      </p>
    </div>
  );
}
