import { useEffect, useRef } from "react";

interface Props {
  imageUrl: string;
  audioUrl?: string;
  isPlaying: boolean;
}

export default function KenBurnsCanvas({
  imageUrl,
  audioUrl,
  isPlaying,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const loadedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const startAnimation = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !loadedRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    cancelAnimationFrame(rafRef.current);
    const duration = 60000;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);

      const startScale = 1.3;
      const endScale = 1.0;
      const scale = startScale - (startScale - endScale) * t;
      const offsetX = 0.1 * t * canvas.width;

      const cw = canvas.width;
      const ch = canvas.height;
      const iAspect = img.naturalWidth / img.naturalHeight;
      const cAspect = cw / ch;

      let sw: number;
      let sh: number;
      let sx: number;
      let sy: number;

      if (iAspect > cAspect) {
        sh = img.naturalHeight;
        sw = sh * cAspect;
        sy = 0;
        sx = (img.naturalWidth - sw) / 2 - offsetX * (sw / cw);
      } else {
        sw = img.naturalWidth;
        sh = sw / cAspect;
        sx = 0;
        sy = (img.naturalHeight - sh) / 2;
      }

      const scaledW = sw / scale;
      const scaledH = sh / scale;
      const scaledX = sx + (sw - scaledW) / 2;
      const scaledY = sy + (sh - scaledH) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, scaledX, scaledY, scaledW, scaledH, 0, 0, cw, ch);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: startAnimation uses stable refs only
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    imgRef.current = img;

    img.onload = () => {
      loadedRef.current = true;
      if (isPlayingRef.current) startAnimation();
    };

    return () => {
      cancelAnimationFrame(rafRef.current);
      loadedRef.current = false;
    };
  }, [imageUrl]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: startAnimation uses stable refs only
  useEffect(() => {
    if (isPlaying) {
      if (loadedRef.current) startAnimation();
      if (audioUrl && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    } else {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={360}
        height={640}
        className="w-full h-full object-cover"
      />
      {/* biome-ignore lint/a11y/useMediaCaption: Ken Burns preview does not require captions */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}
    </>
  );
}
