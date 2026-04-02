import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ApiKeyStatus } from "../backend";
import { useActor } from "../hooks/useActor";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdminSettings({ open, onClose }: Props) {
  const { actor } = useActor();
  const [keys, setKeys] = useState({ openai: "", elevenlabs: "", did: "" });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    elevenlabs: false,
    did: false,
  });
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    if (open && actor) {
      setLoadingStatus(true);
      actor
        .getApiKeyStatus()
        .then((s) => setStatus(s))
        .catch(() => {})
        .finally(() => setLoadingStatus(false));
    }
  }, [open, actor]);

  const handleSave = async () => {
    if (!actor) return;
    setSaving(true);
    try {
      await actor.setApiKeys(keys.openai, keys.elevenlabs, keys.did);
      toast.success("API keys saved successfully");
      const s = await actor.getApiKeyStatus();
      setStatus(s);
      setKeys({ openai: "", elevenlabs: "", did: "" });
    } catch {
      toast.error("Failed to save API keys");
    } finally {
      setSaving(false);
    }
  };

  const StatusBadge = ({ configured }: { configured: boolean }) =>
    configured ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Configured
      </Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
        <XCircle className="w-3 h-3" /> Missing
      </Badge>
    );

  const apiFields = [
    {
      key: "openai" as const,
      label: "OpenAI API Key",
      placeholder: "sk-...",
      hint: "Used for script generation via GPT-4",
    },
    {
      key: "elevenlabs" as const,
      label: "ElevenLabs API Key",
      placeholder: "el-...",
      hint: "Used for realistic voiceover synthesis",
    },
    {
      key: "did" as const,
      label: "D-ID API Key",
      placeholder: "Basic ...",
      hint: "Used for talking-head video generation",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-card border-border max-w-md"
        data-ocid="admin.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Admin Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure API keys for the AI pipeline. Keys are stored securely in
            the backend canister.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current Status
          </p>
          {loadingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : status ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">OpenAI</span>
                <StatusBadge configured={status.openai} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">ElevenLabs</span>
                <StatusBadge configured={status.elevenlabs} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">D-ID</span>
                <StatusBadge configured={status.did} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to load status
            </p>
          )}
        </div>

        <div className="space-y-3">
          {apiFields.map(({ key, label, placeholder, hint }) => (
            <div key={key} className="space-y-1">
              <Label className="text-foreground text-sm">{label}</Label>
              <div className="relative">
                <Input
                  type={showKeys[key] ? "text" : "password"}
                  placeholder={placeholder}
                  value={keys[key]}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="bg-input border-border text-foreground pr-10 placeholder:text-muted-foreground"
                  data-ocid={`admin.${key}.input`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys[key] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-border bg-transparent text-foreground"
            data-ocid="admin.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!keys.openai && !keys.elevenlabs && !keys.did)}
            className="flex-1 bg-primary hover:bg-accent text-primary-foreground"
            data-ocid="admin.save_button"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Keys
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
