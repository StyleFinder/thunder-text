type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  return {
    toast: ({
      title: _title,
      description: _description,
      variant: _variant,
    }: ToastProps) => {
      // Simple console-based toast for now
    },
  };
}
