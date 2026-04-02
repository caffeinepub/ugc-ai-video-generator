import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Pause, Play, RefreshCw, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { ScriptResult } from "../backend";
import KenBurnsCanvas from "./KenBurnsCanvas";

interface Props {
  imagePreviewUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  scriptResult: ScriptResult | null;
  isGenerating: boolean;
  useFallback: boolean;
  onDownload: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  currentStepLabel: string | null;
}

export default function PreviewPanel({
  imagePreviewUrl,
  videoUrl,
  audioUrl,
  scriptResult,
  isGenerating,
  useFallback,
  onDownload,
  onRegenerate,
  isRegenerating,
  currentStepLabel,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitleIndex, setSubtitleIndex] = useState(0);

  const subtitles = scriptResult
    ? [
        scriptResult.hook,
        scriptResult.problem,
        scriptResult.solution,
        scriptResult.callToAction,
      ].filter(Boolean)
    : [];

  const hasContent = videoUrl || (useFallback && imagePreviewUrl);
  const canDownload = !!videoUrl;

  const handlePlayPause = () => {
    if (!isPlaying && subtitles.length > 0) {
      let idx = 0;
      const interval = setInterval(() => {
        idx = (idx + 1) % subtitles.length;
        setSubtitleIndex(idx);
        if (idx === subtitles.length - 1) clearInterval(interval);
      }, 3500);
    }
    setIsPlaying((p) => !p);
  };

  return (
    <div className="flex flex-col gap-4" data-ocid="preview.panel">
      {/* Phone mockup */}
      <div className="flex justify-center">
        <div
          className="relative phone-shadow rounded-[2.5rem] border-2 border-border overflow-hidden"
          style={{
            width: 220,
            height: 390,
            backgroundColor: "oklch(0.12 0.013 252)",
          }}
          data-ocid="preview.card"
        >
          {/* Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-background rounded-full z-10" />

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              {videoUrl ? (
                <motion.video
                  key="video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  loop
                  playsInline
                  autoPlay={isPlaying}
                  muted={false}
                  data-ocid="preview.canvas_target"
                />
              ) : useFallback && imagePreviewUrl ? (
                <motion.div
                  key="kenburns"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full"
                >
                  <KenBurnsCanvas
                    imageUrl={imagePreviewUrl}
                    audioUrl={audioUrl ?? undefined}
                    isPlaying={isPlaying}
                  />
                </motion.div>
              ) : imagePreviewUrl ? (
                <motion.img
                  key="image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={imagePreviewUrl}
                  alt="Uploaded"
                  className="w-full h-full object-cover"
                />
              ) : (
                <motion.div
                  key="empty"
                  className="w-full h-full flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Play className="w-5 h-5 text-muted-foreground" />
                  </div>
                  {isGenerating && currentStepLabel ? (
                    <div className="text-center px-3">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {([0, 0.15, 0.3] as number[]).map((d, i) => (
                          <span
                            // biome-ignore lint/suspicious/noArrayIndexKey: static animation
                            key={i}
                            className="w-1 h-3 rounded-full bg-primary animate-wave"
                            style={{ animationDelay: `${d}s` }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {currentStepLabel}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center px-4">
                      Upload an image and generate your video
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Subtitle overlay */}
          {hasContent && isPlaying && subtitles.length > 0 && (
            <div className="absolute bottom-8 left-0 right-0 px-2 z-20">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
                <p className="text-white text-[9px] font-bold leading-tight">
                  {subtitles[subtitleIndex]}
                </p>
              </div>
            </div>
          )}

          {/* Play button overlay */}
          {hasContent && (
            <button
              type="button"
              onClick={handlePlayPause}
              className="absolute inset-0 flex items-center justify-center z-10 hover:bg-black/10 transition-colors group"
              data-ocid="preview.toggle"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity",
                  isPlaying
                    ? "opacity-0 group-hover:opacity-100"
                    : "opacity-100",
                )}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </div>
            </button>
          )}

          {/* 9:16 badge */}
          <div className="absolute top-6 right-2 z-20">
            <Badge className="text-[8px] px-1 py-0 bg-primary/80 border-0">
              9:16
            </Badge>
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground/30 rounded-full" />
        </div>
      </div>

      {/* Info row */}
      {hasContent && (
        <div className="text-center space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {videoUrl
              ? "Video ready · MP4 · 1080×1920"
              : "Preview mode · Ken Burns"}
          </p>
          {audioUrl && !videoUrl && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Volume2 className="w-3 h-3" />
              <span>Audio attached</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating || isGenerating}
          className="flex-1 border-border bg-transparent hover:bg-muted text-foreground gap-1.5"
          data-ocid="preview.secondary_button"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isRegenerating && "animate-spin")}
          />
          Re-generate
        </Button>
        <Button
          size="sm"
          onClick={onDownload}
          disabled={!canDownload}
          className="flex-1 bg-primary hover:bg-accent text-primary-foreground gap-1.5 glow-primary"
          data-ocid="preview.primary_button"
        >
          <Download className="w-3.5 h-3.5" />
          Download (1080p)
        </Button>
      </div>
    </div>
  );
}
