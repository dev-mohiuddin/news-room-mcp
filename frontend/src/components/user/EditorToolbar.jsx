import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Sparkles,
  Wand2,
  Maximize,
  Minimize,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const FORMATTING = [
  { icon: Bold,       tip: "Bold (⌘B)" },
  { icon: Italic,     tip: "Italic (⌘I)" },
  { icon: Underline,  tip: "Underline (⌘U)" },
];

const HEADINGS = [
  { icon: Heading1,    tip: "Heading 1" },
  { icon: Heading2,    tip: "Heading 2" },
];

const BLOCKS = [
  { icon: List,        tip: "Bullet list" },
  { icon: ListOrdered, tip: "Numbered list" },
  { icon: Quote,       tip: "Quote" },
  { icon: Code,        tip: "Code block" },
  { icon: LinkIcon,    tip: "Link (⌘K)" },
];

const AI_TOOLS = [
  { icon: Sparkles, label: "Rewrite",  tip: "Rewrite selection" },
  { icon: Wand2,    label: "Improve",  tip: "Improve clarity" },
  { icon: Maximize, label: "Expand",   tip: "Expand paragraph" },
  { icon: Minimize, label: "Shorten",  tip: "Shorten paragraph" },
  { icon: CheckCheck, label: "Grammar", tip: "Fix grammar" },
];

export default function EditorToolbar() {
  const ai = (action) => {
    toast.loading(`Running ${action}…`, { id: action });
    setTimeout(() => toast.success(`${action} complete`, { id: action }), 700);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 flex-wrap p-2 rounded-xl glass border border-white/10">
        {FORMATTING.map((b) => (
          <ToolBtn key={b.tip} {...b} />
        ))}
        <Separator orientation="vertical" className="h-5 mx-1" />
        {HEADINGS.map((b) => (
          <ToolBtn key={b.tip} {...b} />
        ))}
        <Separator orientation="vertical" className="h-5 mx-1" />
        {BLOCKS.map((b) => (
          <ToolBtn key={b.tip} {...b} />
        ))}

        <div className="ml-auto flex items-center gap-1">
          <Separator orientation="vertical" className="h-5" />
          {AI_TOOLS.map((t) => (
            <Tooltip key={t.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => ai(t.label)}
                  className="text-xs gap-1.5 text-brand-violet hover:text-brand-violet hover:bg-brand-violet/10"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.tip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function ToolBtn({ icon: Icon, tip }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
