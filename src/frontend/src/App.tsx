import { Toaster } from "@/components/ui/sonner";
import VideoGenerator from "./pages/VideoGenerator";

export default function App() {
  return (
    <div className="dark min-h-screen bg-background">
      <VideoGenerator />
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
