import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border bg-white text-gray-900 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: '14px',
          padding: '12px',
          borderColor: '#e5e7eb',
          borderRadius: '8px',
          color: '#003366',
          ...style
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#0066cc'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb'
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
