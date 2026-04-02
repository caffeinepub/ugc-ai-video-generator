# UGC AI Video Generator

## Current State
New project. No existing application files.

## Requested Changes (Diff)

### Add
- Full end-to-end UGC video generation pipeline
- Image upload (stored in blob-storage)
- AI script generation via OpenAI API (HTTP outcall)
- Voiceover generation via ElevenLabs API (HTTP outcall)
- Talking-head video creation via D-ID API (HTTP outcall)
- Fallback Ken Burns animation support (frontend canvas-based)
- Subtitle/caption generation from script
- Final video preview and MP4 download
- Admin API key configuration (stored in backend, never exposed to frontend)
- Job status tracking with 4 progress steps
- "Regenerate Script" functionality
- "Download Video" button

### Modify
N/A (new project)

### Remove
N/A (new project)

## Implementation Plan

### Backend (Motoko)
- Admin config store: set/get API keys (OpenAI, ElevenLabs, D-ID) — stored as stable vars with placeholder values clearly marked
- `generateScript(prompt, tone, voiceType)` — HTTP outcall to OpenAI Chat Completions API
  - Returns structured script: { hook, problem, solution, callToAction, fullScript, estimatedDuration }
- `generateVoiceover(script, voiceType)` — HTTP outcall to ElevenLabs TTS API
  - Returns audio URL or base64 blob reference
- `generateTalkingVideo(imageUrl, audioUrl)` — HTTP outcall to D-ID talks API
  - Returns video URL
- `pollVideoStatus(jobId)` — HTTP outcall to D-ID to check job completion
- `getVideoResult(jobId)` — retrieve final video URL when ready
- Job record stored with status: pending | processing | done | error
- Blob-storage for uploaded images

### Frontend (React/TypeScript)
- Dark modern UI, 9:16 video preview panel
- Input panel: image upload, prompt textarea, voice type dropdown (Male/Female), tone dropdown (Casual/Emotional/Funny/Promotional)
- "Generate Video" CTA button
- Progress stepper: Step 1 Generating Script → Step 2 Creating Voiceover → Step 3 Generating Video → Step 4 Finalizing
- Script display card with "Regenerate Script" button (re-calls generateScript)
- Video preview section (HTML5 video element, 9:16 aspect ratio)
- "Download Video" button (triggers MP4 download)
- Subtitle overlay rendered on preview (parsed from fullScript with timing)
- Error states with clear messaging
- Mobile responsive layout

### API Key Placeholders
- OPENAI_API_KEY: clearly marked in backend stable var
- ELEVENLABS_API_KEY: clearly marked in backend stable var  
- DID_API_KEY: clearly marked in backend stable var

### FFmpeg / Video Merging
- D-ID handles audio+video merge server-side
- Subtitles rendered as frontend overlay on the preview player
- For download: provide the D-ID video URL directly (subtitles are frontend-only overlay)
- Fallback (if D-ID fails): frontend Ken Burns canvas animation using uploaded image + audio element
