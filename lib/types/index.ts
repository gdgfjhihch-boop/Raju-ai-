/**
 * Raju-ai- Agent Type Definitions
 * Core types for the autonomous AI agent system
 */

export interface Model {
  id: string;
  name: string;
  url: string;
  fileSize: number;
  checksum?: string;
  downloadedAt: number;
  localPath: string;
  format: "gguf" | "other";
  isActive: boolean;
}

export interface APIKey {
  provider: "openai" | "anthropic" | "gemini";
  key: string;
  isValid: boolean;
  lastVerified: number;
}

export interface AgentMode {
  type: "offline" | "cloud";
  activeModel?: string;
  activeProvider?: "openai" | "anthropic" | "gemini";
}

export interface ReasoningPhase {
  type: "plan" | "execute" | "reflect";
  timestamp: number;
  content: string;
  details?: Record<string, unknown>;
}

export interface ThoughtStream {
  id: string;
  taskId: string;
  phases: ReasoningPhase[];
  startTime: number;
  endTime?: number;
}

export interface Experience {
  id: string;
  taskDescription: string;
  mode: "offline" | "cloud";
  model: string;
  input: string;
  output: string;
  reasoning: ThoughtStream;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
  embedding?: number[];
}

export interface Task {
  id: string;
  description: string;
  status: "pending" | "processing" | "completed" | "failed";
  mode: "offline" | "cloud";
  model: string;
  createdAt: number;
  completedAt?: number;
  result?: string;
  experienceId?: string;
}

export interface DownloadProgress {
  totalBytes: number;
  downloadedBytes: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
}

export interface FileIntegrityCheck {
  fileSize: number;
  expectedSize?: number;
  checksum?: string;
  expectedChecksum?: string;
  isValid: boolean;
  error?: string;
}

export interface StorageInfo {
  totalSpace: number;
  freeSpace: number;
  usedSpace: number;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AgentConfig {
  maxMemorySize: number;
  maxExperiences: number;
  autoCleanupThreshold: number;
  defaultMode: "offline" | "cloud";
  enableLogging: boolean;
}
