/**
 * Agent Provider
 * Manages agent state, mode, and thought stream across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { agent } from "@/lib/core/autonomous-agent";
import { MemoryStore } from "@/lib/services/memory-store";
import { ModelManager } from "@/lib/services/model-manager";
import type { AgentMode, ThoughtStream, Experience } from "@/lib/types";

interface AgentContextType {
  mode: AgentMode;
  setMode: (mode: AgentMode) => void;
  currentThoughtStream: ThoughtStream | null;
  isProcessing: boolean;
  executeTask: (taskDescription: string) => Promise<Experience>;
  recentExperiences: Experience[];
  memoryStats: { totalExperiences: number; totalMemorySize: number };
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AgentMode>({ type: "offline" });
  const [currentThoughtStream, setCurrentThoughtStream] = useState<ThoughtStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentExperiences, setRecentExperiences] = useState<Experience[]>([]);
  const [memoryStats, setMemoryStats] = useState({ totalExperiences: 0, totalMemorySize: 0 });

  // Initialize agent on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await agent.initialize(mode);
        await ModelManager.initialize();
        await MemoryStore.initialize();
        await loadRecentExperiences();
        await loadMemoryStats();
      } catch (error) {
        console.error("Failed to initialize agent:", error);
      }
    };

    initialize();
  }, []);

  const loadRecentExperiences = async () => {
    try {
      const experiences = await MemoryStore.getAllExperiences();
      setRecentExperiences(experiences.slice(-5).reverse());
    } catch (error) {
      console.error("Failed to load recent experiences:", error);
    }
  };

  const loadMemoryStats = async () => {
    try {
      const stats = await MemoryStore.getMemoryStats();
      setMemoryStats({
        totalExperiences: stats.totalExperiences,
        totalMemorySize: stats.totalMemorySize,
      });
    } catch (error) {
      console.error("Failed to load memory stats:", error);
    }
  };

  const handleSetMode = (newMode: AgentMode) => {
    setMode(newMode);
    agent.setMode(newMode);
  };

  const handleExecuteTask = async (taskDescription: string): Promise<Experience> => {
    try {
      setIsProcessing(true);

      // Execute task with agent
      const experience = await agent.executeTask(taskDescription);

      // Update thought stream in real-time
      setCurrentThoughtStream(experience.reasoning);

      // Reload recent experiences
      await loadRecentExperiences();
      await loadMemoryStats();

      return experience;
    } catch (error) {
      console.error("Failed to execute task:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const value: AgentContextType = {
    mode,
    setMode: handleSetMode,
    currentThoughtStream,
    isProcessing,
    executeTask: handleExecuteTask,
    recentExperiences,
    memoryStats,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextType {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within AgentProvider");
  }
  return context;
}
