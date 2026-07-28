import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowLeft,
  Badge,
  BadgeCheck,
  BellPlus,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  CircleHelp,
  CirclePlus,
  Clock3,
  Code2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FilePenLine,
  Fingerprint,
  Gavel,
  History,
  Hourglass,
  Landmark,
  LayoutDashboard,
  Link2,
  List,
  Lock,
  NotebookPen,
  PiggyBank,
  RefreshCw,
  Search,
  SearchX,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  UserRoundCheck,
  Wallet,
  X,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  account_balance: Landmark,
  account_balance_wallet: Wallet,
  add_alert: BellPlus,
  add_circle: CirclePlus,
  arrow_back: ArrowLeft,
  auto_mode: Bot,
  badge: Badge,
  check_circle: CircleCheck,
  chevron_right: ChevronRight,
  close: X,
  code: Code2,
  content_copy: Copy,
  dashboard: LayoutDashboard,
  download: Download,
  done: CircleCheck,
  edit_document: FilePenLine,
  edit_note: NotebookPen,
  error: CircleAlert,
  expand_more: ChevronDown,
  fingerprint: Fingerprint,
  gavel: Gavel,
  history: History,
  hourglass_top: Hourglass,
  how_to_reg: UserRoundCheck,
  link: Link2,
  lock: Lock,
  menu_book: BookOpen,
  open_in_new: ExternalLink,
  payments: CreditCard,
  pending: Clock3,
  policy: ShieldCheck,
  savings: PiggyBank,
  search: Search,
  search_off: SearchX,
  security: Shield,
  settings: Settings,
  shield_with_heart: ShieldAlert,
  sync: RefreshCw,
  task_alt: CircleCheckBig,
  terminal: Terminal,
  verified: BadgeCheck,
  view_list: List,
  warning: TriangleAlert,
};

interface IconProps extends Omit<LucideProps, "name"> {
  name: string;
}

export function Icon({ name, className = "", "aria-label": ariaLabel, ...props }: IconProps) {
  const Glyph = icons[name] ?? CircleHelp;

  return (
    <Glyph
      aria-hidden={ariaLabel ? false : true}
      aria-label={ariaLabel}
      className={`inline-block shrink-0 ${className}`.trim()}
      focusable="false"
      size="1em"
      strokeWidth={1.9}
      {...props}
    />
  );
}
