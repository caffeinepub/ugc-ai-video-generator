import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_header {
    value: string;
    name: string;
}
export interface ScriptResult {
    fullScript: string;
    hook: string;
    callToAction: string;
    solution: string;
    estimatedDuration: bigint;
    problem: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ApiKeyStatus {
    did: boolean;
    openai: boolean;
    elevenlabs: boolean;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface JobRecord {
    id: string;
    status: string;
    createdAt: bigint;
    errorMessage?: string;
    audioUrl?: string;
    scriptResult?: ScriptResult;
    videoUrl?: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface backendInterface {
    generateScript(prompt: string, tone: string, voiceType: string): Promise<string>;
    generateVoiceover(script: string, voiceType: string): Promise<string>;
    getApiKeyStatus(): Promise<ApiKeyStatus>;
    getJob(jobId: string): Promise<JobRecord | null>;
    getVideoStatus(jobId: string): Promise<string>;
    listJobs(): Promise<Array<JobRecord>>;
    setApiKeys(openai: string, elevenlabs: string, did: string): Promise<void>;
    startVideoGeneration(imageUrl: string, audioUrl: string): Promise<string>;
    transformRelay(input: TransformationInput): Promise<TransformationOutput>;
}
