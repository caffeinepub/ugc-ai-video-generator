import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Fragment } from "react";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface Step {
  label: string;
  status: StepStatus;
}

interface Props {
  steps: Step[];
}

const WaveIcon = () => (
  <div className="flex items-center gap-0.5 h-4">
    {([0, 0.2, 0.4] as number[]).map((delay, idx) => (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: static animation delays
        key={idx}
        className="w-0.5 h-3 rounded-full bg-primary-foreground animate-wave inline-block"
        style={{ animationDelay: `${delay}s` }}
      />
    ))}
  </div>
);

export default function ProgressStepper({ steps }: Props) {
  return (
    <div className="flex items-center gap-0 w-full max-w-2xl mx-auto">
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500",
                step.status === "done" &&
                  "bg-primary text-primary-foreground glow-primary",
                step.status === "active" &&
                  "bg-primary text-primary-foreground animate-pulse",
                step.status === "pending" &&
                  "bg-muted text-muted-foreground border border-border",
                step.status === "error" &&
                  "bg-destructive text-destructive-foreground",
              )}
            >
              {step.status === "done" && <Check className="w-4 h-4" />}
              {step.status === "active" && <WaveIcon />}
              {step.status === "error" && "!"}
              {step.status === "pending" && <span>{i + 1}</span>}
            </div>
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap transition-colors duration-300",
                step.status === "done" && "text-primary",
                step.status === "active" && "text-foreground",
                step.status === "pending" && "text-muted-foreground",
                step.status === "error" && "text-destructive",
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-1 mb-4 transition-all duration-500 rounded-full",
                steps[i].status === "done" ? "bg-primary" : "bg-border",
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
