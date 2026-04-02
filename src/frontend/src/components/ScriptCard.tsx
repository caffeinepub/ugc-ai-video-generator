import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Lightbulb, Megaphone, Zap } from "lucide-react";
import { motion } from "motion/react";
import type { ScriptResult } from "../backend";

interface Props {
  script: ScriptResult;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const sections = [
  { key: "hook" as const, label: "Hook", icon: Zap, color: "text-yellow-400" },
  {
    key: "problem" as const,
    label: "Problem",
    icon: AlertCircle,
    color: "text-red-400",
  },
  {
    key: "solution" as const,
    label: "Solution",
    icon: Lightbulb,
    color: "text-green-400",
  },
  {
    key: "callToAction" as const,
    label: "Call to Action",
    icon: Megaphone,
    color: "text-primary",
  },
];

export default function ScriptCard({
  script,
  onRegenerate,
  isRegenerating,
}: Props) {
  const duration = Number(script.estimatedDuration);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-4 rounded-xl border border-border bg-card p-4 space-y-3"
      data-ocid="script.card"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm text-foreground">
          Generated Script
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <Clock className="w-3 h-3" />~{duration}s
          </Badge>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-xs text-primary hover:text-accent transition-colors font-medium disabled:opacity-50"
            data-ocid="script.secondary_button"
          >
            {isRegenerating ? "Regenerating..." : "↺ Regenerate"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className={`flex items-center gap-1.5 ${color}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {label}
              </span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {script[key]}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">
          Full Script
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {script.fullScript}
        </p>
      </div>
    </motion.div>
  );
}
