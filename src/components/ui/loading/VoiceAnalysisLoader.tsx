/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wand2, FileText, Sparkles, CheckCircle } from "lucide-react";

interface VoiceAnalysisLoaderProps {
  isLoading: boolean;
  estimatedTimeSeconds?: number;
}

const ANALYSIS_STEPS = [
  {
    icon: FileText,
    title: "Reading your samples",
    tip: "We analyze sentence structure, paragraph flow, and overall organization.",
    duration: 3000,
  },
  {
    icon: Sparkles,
    title: "Analyzing tone and style",
    tip: "Our AI identifies your unique voice patterns and personality traits.",
    duration: 5000,
  },
  {
    icon: Wand2,
    title: "Identifying vocabulary patterns",
    tip: "We map your word choices, phrases, and linguistic fingerprints.",
    duration: 4000,
  },
  {
    icon: CheckCircle,
    title: "Creating your profile",
    tip: "Synthesizing everything into your personalized brand voice guide.",
    duration: 3000,
  },
];

export function VoiceAnalysisLoader({
  isLoading,
  estimatedTimeSeconds = 30,
}: VoiceAnalysisLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0);
      setProgress(0);
      setElapsedTime(0);
      return;
    }

    // Progress interval
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const increment = 100 / (estimatedTimeSeconds * 10); // Update 10 times per second
        return Math.min(prev + increment, 95); // Cap at 95% until actually complete
      });
    }, 100);

    // Elapsed time tracker
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Step progression
    let stepTimeout: NodeJS.Timeout;
    const progressSteps = () => {
      if (currentStep < ANALYSIS_STEPS.length - 1) {
        stepTimeout = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
          progressSteps();
        }, ANALYSIS_STEPS[currentStep].duration);
      }
    };
    progressSteps();

    return () => {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
      clearTimeout(stepTimeout);
    };
  }, [isLoading, currentStep, estimatedTimeSeconds]);

  if (!isLoading) return null;

  const CurrentStepIcon = ANALYSIS_STEPS[currentStep].icon;

  return (
    <Card className="border-2">
      <CardContent className="py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Main Animation */}
          <div className="text-center">
            <div className="relative inline-block">
              {/* Pulsing background */}
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />

              {/* Main icon */}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <CurrentStepIcon className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-6 mb-2">
              {ANALYSIS_STEPS[currentStep].title}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {ANALYSIS_STEPS[currentStep].tip}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{Math.round(progress)}% complete</span>
              <span>
                ~{Math.max(0, estimatedTimeSeconds - elapsedTime)}s remaining
              </span>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="grid grid-cols-4 gap-4">
            {ANALYSIS_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={index}
                  className={`text-center transition-all duration-300 ${
                    isCurrent ? "scale-110" : ""
                  }`}
                >
                  <div
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isComplete
                        ? "border-green-600 bg-green-50"
                        : isCurrent
                          ? "border-primary bg-primary/10 animate-pulse"
                          : "border-muted bg-muted/30"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <StepIcon
                        className={`h-5 w-5 ${
                          isCurrent ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`mt-2 text-xs ${
                      isComplete || isCurrent
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    Step {index + 1}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Educational Tips */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Did you know?
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  • Your voice profile captures over 50 unique writing
                  characteristics
                </p>
                <p>
                  • The AI analyzes sentence length, vocabulary diversity, and
                  emotional tone
                </p>
                <p>
                  • More diverse samples = more accurate voice representation
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
