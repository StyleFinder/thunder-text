'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Cpu } from 'lucide-react';
import { colors } from '@/lib/design-system/colors';
import type { OpenAIImageModel } from '@/types/image-generation';

interface ProviderSelectorProps {
  openaiModel: OpenAIImageModel;
  onOpenaiModelChange: (model: OpenAIImageModel) => void;
  disabled?: boolean;
}

// Note: Only GPT Image 1 is available because it's the only OpenAI model
// that supports the images.edit API for incorporating reference images.
// DALL-E 3 only supports text-to-image generation without reference images.
const OPENAI_MODELS = [
  {
    id: 'gpt-image-1' as OpenAIImageModel,
    name: 'GPT Image 1',
    description: 'Supports reference images for product placement',
    cost: '$0.01/image',
  },
];

export function ProviderSelector({
  openaiModel,
  onOpenaiModelChange,
  disabled = false,
}: ProviderSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Cpu className="w-4 h-4" style={{ color: colors.smartBlue }} />
          AI Model
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        {/* Model Selection */}
        <div className="space-y-1">
          <Label className="text-xs font-medium" style={{ color: colors.grayText }}>
            Model
          </Label>
          <RadioGroup
            value={openaiModel}
            onValueChange={(value) => onOpenaiModelChange(value as OpenAIImageModel)}
            disabled={disabled}
            className="space-y-1.5"
          >
            {OPENAI_MODELS.map((model) => {
              const isSelected = openaiModel === model.id;

              return (
                <Label
                  key={model.id}
                  htmlFor={model.id}
                  className={`
                    flex flex-col p-2 rounded-lg border cursor-pointer
                    transition-all duration-200
                    ${isSelected ? 'border-2' : 'border hover:border-gray-400'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                    borderColor: isSelected ? colors.smartBlue : colors.border,
                    backgroundColor: isSelected ? `${colors.smartBlue}08` : colors.white,
                  }}
                >
                  <RadioGroupItem value={model.id} id={model.id} className="sr-only" />
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-medium"
                      style={{ color: isSelected ? colors.smartBlue : colors.oxfordNavy }}
                    >
                      {model.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        borderColor: colors.border,
                        color: colors.grayText,
                      }}
                    >
                      {model.cost}
                    </Badge>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
