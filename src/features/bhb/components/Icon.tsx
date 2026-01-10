/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
import React from "react";
import {
  Home,
  LayoutDashboard,
  TrendingUp,
  Archive,
  Book,
  Settings,
  User,
  Search,
  Filter,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Link,
  ExternalLink,
  RefreshCw,
  Download,
  Upload,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { colors } from "@/lib/design-system/colors";

export type IconName =
  | "home"
  | "dashboard"
  | "chart"
  | "archive"
  | "book"
  | "settings"
  | "user"
  | "search"
  | "filter"
  | "edit"
  | "delete"
  | "add"
  | "check"
  | "close"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up"
  | "arrow-down"
  | "chevron-right"
  | "chevron-left"
  | "chevron-up"
  | "chevron-down"
  | "calendar"
  | "clock"
  | "dollar"
  | "eye"
  | "link"
  | "external"
  | "refresh"
  | "download"
  | "upload"
  | "info"
  | "warning"
  | "error"
  | "success";

export interface IconProps {
  name: IconName;
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

const iconMap: Record<IconName, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  chart: TrendingUp,
  archive: Archive,
  book: Book,
  settings: Settings,
  user: User,
  search: Search,
  filter: Filter,
  edit: Edit,
  delete: Trash2,
  add: Plus,
  check: Check,
  close: X,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-up": ChevronUp,
  "chevron-down": ChevronDown,
  calendar: Calendar,
  clock: Clock,
  dollar: DollarSign,
  eye: Eye,
  link: Link,
  external: ExternalLink,
  refresh: RefreshCw,
  download: Download,
  upload: Upload,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
};

export function Icon({
  name,
  size = 24,
  color = colors.oxfordNavy,
  className = "",
  style = {},
  strokeWidth = 2,
}: IconProps) {
  const LucideIcon = iconMap[name];

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in Lucide icon map`);
    return null;
  }

  return (
    <LucideIcon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}
