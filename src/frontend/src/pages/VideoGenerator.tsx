import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ImageIcon,
  Loader2,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ApiKeyStatus, ScriptResult } from "../backend";
import AdminSettings from "../components/AdminSettings";
import PreviewPanel from "../components/PreviewPanel";
import ProgressStepper, {
  type StepStatus,
} from "../components/ProgressStepper";
import ScriptCard from "../components/ScriptCard";
import { useActor } from "../hooks/useActor";
import { useImageUpload } from "../hooks/useImageUpload";

type VoiceType = "Male" | "Female";
type Tone = "Casual" | "Emotional" | "Funny" | "Promotional";

const STEPS = [
  "Generating Script",
  "Creating Voiceover",
  "Generating Video",
  "Finalizing",
];

function parseJsonResult<T>(raw: string): { ok: T } | { err: string } {
  try {
    return JSON.parse(raw) as { ok: T } | { err: string };
  } catch {
    return { err: raw };
  }
}

export default function VideoGenerator() {
  const { actor } = useActor();
  const { upload, uploadProgress, isUploading } = useImageUpload();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [voiceType, setVoiceType] = useState<VoiceType>("Female");
  const [tone, setTone] = useState<Tone>("Casual");

  const [isGenerating, setIsGenerating] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([
    "pending",
    "pending",
    "pending",
    "pending",
  ]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const [imageUploadedUrl, setImageUploadedUrl] = useState<string | null>(null);
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);

  const actorRef = useRef(actor);
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  useEffect(() => {
    if (actor) {
      actor
        .getApiKeyStatus()
        .then((s) => setApiKeyStatus(s))
        .catch(() => {});
    }
  }, [actor]);

  const setStep = (idx: number, status: StepStatus) => {
    setStepStatuses((prev) => {
      const next = [...prev] as StepStatus[];
      next[idx] = status;
      return next;
    });
    setCurrentStep(idx);
  };

  const resetPipeline = () => {
    setStepStatuses(["pending", "pending", "pending", "pending"]);
    setCurrentStep(-1);
    setError(null);
    setScriptResult(null);
    setAudioUrl(null);
    setVideoUrl(null);
    setUseFallback(false);
  };

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setImageUploadedUrl(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  };

  const pollVideoStatus = async (jId: string): Promise<string | null> => {
    const MAX_ATTEMPTS = 20;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const a = actorRef.current;
      if (!a) break;
      try {
        const raw = await a.getVideoStatus(jId);
        const parsed = parseJsonResult<{ status: string; videoUrl?: string }>(
          raw,
        );
        if ("ok" in parsed) {
          if (parsed.ok.status === "done" && parsed.ok.videoUrl)
            return parsed.ok.videoUrl;
          if (parsed.ok.status === "error") return null;
        }
      } catch {
        // continue polling
      }
    }
    return null;
  };

  const startGeneration = async () => {
    if (!actor) {
      toast.error("Backend not connected. Please wait.");
      return;
    }
    if (!imageFile) {
      toast.error("Please upload an image first");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Please enter a prompt describing your video");
      return;
    }

    resetPipeline();
    setIsGenerating(true);

    try {
      let uploadedUrl = imageUploadedUrl;
      if (!uploadedUrl) {
        toast.info("Uploading image...");
        uploadedUrl = await upload(imageFile);
        setImageUploadedUrl(uploadedUrl);
      }

      setStep(0, "active");
      const scriptRaw = await actor.generateScript(
        prompt.trim(),
        tone,
        voiceType,
      );
      const scriptParsed = parseJsonResult<ScriptResult>(scriptRaw);
      if ("err" in scriptParsed) throw new Error(scriptParsed.err);
      const script = scriptParsed.ok;
      setScriptResult(script);
      setStep(0, "done");

      setStep(1, "active");
      const voiceRaw = await actor.generateVoiceover(
        script.fullScript,
        voiceType,
      );
      const voiceParsed = parseJsonResult<string>(voiceRaw);
      if ("err" in voiceParsed) throw new Error(voiceParsed.err);
      const voiceAudioUrl = voiceParsed.ok;
      setAudioUrl(voiceAudioUrl);
      setStep(1, "done");

      setStep(2, "active");
      const videoRaw = await actor.startVideoGeneration(
        uploadedUrl,
        voiceAudioUrl,
      );
      const videoParsed = parseJsonResult<string>(videoRaw);

      if ("err" in videoParsed) {
        toast.warning(
          "Video API not available. Using Ken Burns animation fallback.",
        );
        setUseFallback(true);
        setStep(2, "done");
      } else {
        const newJobId = videoParsed.ok;
        const foundUrl = await pollVideoStatus(newJobId);
        if (foundUrl) {
          setVideoUrl(foundUrl);
          setStep(2, "done");
        } else {
          toast.warning(
            "Video generation timed out. Using Ken Burns fallback.",
          );
          setUseFallback(true);
          setStep(2, "done");
        }
      }

      setStep(3, "active");
      await new Promise((r) => setTimeout(r, 800));
      setStep(3, "done");
      toast.success("Video ready! 🎬");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setStepStatuses((prev) => {
        const next = [...prev] as StepStatus[];
        const activeIdx = next.findIndex((s) => s === "active");
        if (activeIdx >= 0) next[activeIdx] = "error";
        return next;
      });
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateScript = async () => {
    if (!actor || !prompt.trim()) return;
    setIsRegenerating(true);
    try {
      const raw = await actor.generateScript(prompt.trim(), tone, voiceType);
      const parsed = parseJsonResult<ScriptResult>(raw);
      if ("err" in parsed) throw new Error(parsed.err);
      setScriptResult(parsed.ok);
      toast.success("Script regenerated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to regenerate");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "ugc-video-1080p.mp4";
    a.click();
    toast.success("Download started!");
  };

  const missingKeys =
    apiKeyStatus && (!apiKeyStatus.openai || !apiKeyStatus.elevenlabs);
  const currentStepLabel = currentStep >= 0 ? STEPS[currentStep] : null;
  const steps = STEPS.map((label, i) => ({ label, status: stepStatuses[i] }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground text-lg tracking-tight hidden sm:block">
              UGC AI
            </span>
          </div>

          <h1 className="font-display font-bold text-foreground text-xl tracking-tight">
            UGC AI Video Generator
          </h1>

          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            className="w-8 h-8 rounded-lg border border-border bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            data-ocid="header.open_modal_button"
            title="Admin Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
        <AnimatePresence>
          {missingKeys && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3"
              data-ocid="warning.error_state"
            >
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-200">
                API keys not fully configured.{" "}
                <button
                  type="button"
                  onClick={() => setAdminOpen(true)}
                  className="underline font-medium"
                  data-ocid="warning.open_modal_button"
                >
                  Configure in Admin Settings
                </button>{" "}
                to enable AI features.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {(isGenerating || currentStep >= 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card px-4 py-4"
            data-ocid="stepper.panel"
          >
            <ProgressStepper steps={steps} />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* LEFT: Form */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <h2 className="font-display font-bold text-foreground text-lg">
                Create New Video
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Fill in the details to generate your UGC-style video
              </p>
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <Label
                className="text-foreground font-medium flex items-center gap-1.5"
                htmlFor="image-upload"
              >
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Upload Image
              </Label>
              <label
                htmlFor="image-upload"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer block",
                  imagePreviewUrl
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-primary/5",
                )}
                data-ocid="upload.dropzone"
              >
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageSelect(f);
                  }}
                />
                {imagePreviewUrl ? (
                  <div className="flex items-center gap-3 p-3">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {imageFile?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {imageFile
                          ? `${(imageFile.size / 1024).toFixed(0)} KB`
                          : ""}
                      </p>
                      {isUploading && (
                        <div className="mt-1.5">
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-primary mt-0.5">
                            Uploading {uploadProgress}%
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setImageFile(null);
                        setImagePreviewUrl(null);
                        setImageUploadedUrl(null);
                      }}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                      data-ocid="upload.delete_button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Drop image here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Describe Your Video
              </Label>
              <Textarea
                placeholder="e.g. A glowing skin serum that helps reduce dark spots and gives a natural glow in 7 days..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[90px]"
                data-ocid="form.textarea"
              />
              <p className="text-xs text-muted-foreground">
                Describe the product or scene. The AI will create a structured
                UGC script with hook, problem, solution and CTA.
              </p>
            </div>

            {/* Voice & Tone */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Voice & Tone
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Voiceover Style
                  </p>
                  <Select
                    value={voiceType}
                    onValueChange={(v) => setVoiceType(v as VoiceType)}
                  >
                    <SelectTrigger
                      className="bg-input border-border text-foreground"
                      data-ocid="form.voice.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="Male">Male Voice</SelectItem>
                      <SelectItem value="Female">Female Voice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Video Tone</p>
                  <Select
                    value={tone}
                    onValueChange={(v) => setTone(v as Tone)}
                  >
                    <SelectTrigger
                      className="bg-input border-border text-foreground"
                      data-ocid="form.tone.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Emotional">Emotional</SelectItem>
                      <SelectItem value="Funny">Funny</SelectItem>
                      <SelectItem value="Promotional">Promotional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 flex items-start gap-2"
                  data-ocid="form.error_state"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={startGeneration}
              disabled={isGenerating || !imageFile || !prompt.trim()}
              className="w-full h-12 bg-primary hover:bg-accent text-primary-foreground font-semibold text-base gap-2 glow-primary"
              data-ocid="form.submit_button"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {currentStepLabel ?? "Processing..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate UGC Video
                </>
              )}
            </Button>
          </div>

          {/* RIGHT: Preview */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <h2 className="font-display font-bold text-foreground text-lg">
                Preview
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                9:16 vertical format · Instagram Reels / TikTok
              </p>
            </div>
            <PreviewPanel
              imagePreviewUrl={imagePreviewUrl}
              videoUrl={videoUrl}
              audioUrl={audioUrl}
              scriptResult={scriptResult}
              isGenerating={isGenerating}
              useFallback={useFallback}
              onDownload={handleDownload}
              onRegenerate={startGeneration}
              isRegenerating={isRegenerating}
              currentStepLabel={currentStepLabel}
            />
          </div>
        </div>

        <AnimatePresence>
          {scriptResult && (
            <ScriptCard
              script={scriptResult}
              onRegenerate={regenerateScript}
              isRegenerating={isRegenerating}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border py-4 mt-8">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ·{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            className="hover:text-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            Built with ♥ using caffeine.ai
          </a>
        </p>
      </footer>

      <AdminSettings open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
}
