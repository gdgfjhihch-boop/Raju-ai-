/**
 * Autonomous Agent Core
 * Implements Plan -> Execute -> Reflect reasoning loop
 */

import { APIVault } from "@/lib/services/api-vault";
import { MemoryStore } from "@/lib/services/memory-store";
import type { Experience, ThoughtStream, ReasoningPhase, Task, AgentMode } from "@/lib/types";

export class AutonomousAgent {
  private mode: AgentMode = { type: "offline" };
  private currentThoughtStream: ThoughtStream | null = null;

  /**
   * Initialize agent with mode
   */
  async initialize(mode: AgentMode): Promise<void> {
    this.mode = mode;
    await MemoryStore.initialize();
  }

  /**
   * Execute a task with full reasoning loop
   */
  async executeTask(taskDescription: string): Promise<Experience> {
    const taskId = `task_${Date.now()}`;
    const thoughtStream: ThoughtStream = {
      id: `thought_${taskId}`,
      taskId,
      phases: [],
      startTime: Date.now(),
    };

    this.currentThoughtStream = thoughtStream;

    try {
      // Phase 1: PLAN
      const planPhase = await this.planPhase(taskDescription);
      thoughtStream.phases.push(planPhase);

      // Phase 2: EXECUTE
      const executePhase = await this.executePhase(taskDescription, planPhase);
      thoughtStream.phases.push(executePhase);

      // Phase 3: REFLECT
      const reflectPhase = await this.reflectPhase(taskDescription, executePhase);
      thoughtStream.phases.push(reflectPhase);

      thoughtStream.endTime = Date.now();

      // Create and store experience
      const experience: Experience = {
        id: `exp_${taskId}`,
        taskDescription,
        mode: this.mode.type,
        model: this.mode.activeModel || "default",
        input: taskDescription,
        output: executePhase.content,
        reasoning: thoughtStream,
        success: !executePhase.content.includes("error"),
        timestamp: Date.now(),
      };

      await MemoryStore.storeExperience(experience);

      return experience;
    } catch (error) {
      thoughtStream.endTime = Date.now();

      const experience: Experience = {
        id: `exp_${taskId}`,
        taskDescription,
        mode: this.mode.type,
        model: this.mode.activeModel || "default",
        input: taskDescription,
        output: String(error),
        reasoning: thoughtStream,
        success: false,
        errorMessage: String(error),
        timestamp: Date.now(),
      };

      await MemoryStore.storeExperience(experience);

      throw error;
    }
  }

  /**
   * PLAN Phase: Analyze task and create execution plan
   */
  private async planPhase(taskDescription: string): Promise<ReasoningPhase> {
    const startTime = Date.now();

    try {
      // Analyze task requirements
      const plan = await this.analyzePlan(taskDescription);

      return {
        type: "plan",
        timestamp: startTime,
        content: plan,
        details: {
          taskType: this.identifyTaskType(taskDescription),
          complexity: this.estimateComplexity(taskDescription),
          requiredTools: this.identifyRequiredTools(taskDescription),
        },
      };
    } catch (error) {
      return {
        type: "plan",
        timestamp: startTime,
        content: `Failed to create plan: ${error}`,
      };
    }
  }

  /**
   * EXECUTE Phase: Execute the plan
   */
  private async executePhase(taskDescription: string, planPhase: ReasoningPhase): Promise<ReasoningPhase> {
    const startTime = Date.now();

    try {
      let result: string;

      if (this.mode.type === "offline") {
        result = await this.executeOffline(taskDescription);
      } else {
        result = await this.executeCloud(taskDescription);
      }

      return {
        type: "execute",
        timestamp: startTime,
        content: result,
        details: {
          mode: this.mode.type,
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        type: "execute",
        timestamp: startTime,
        content: `Execution failed: ${error}`,
      };
    }
  }

  /**
   * REFLECT Phase: Self-check and learn
   */
  private async reflectPhase(taskDescription: string, executePhase: ReasoningPhase): Promise<ReasoningPhase> {
    const startTime = Date.now();

    try {
      // Check for similar past experiences
      const pastExperiences = await MemoryStore.getAllExperiences();
      const similarExperiences = pastExperiences.filter((e) =>
        e.taskDescription.toLowerCase().includes(taskDescription.toLowerCase())
      );

      // Self-correction logic
      const reflection = await this.selfCorrect(executePhase.content, similarExperiences);

      return {
        type: "reflect",
        timestamp: startTime,
        content: reflection,
        details: {
          similarExperiences: similarExperiences.length,
          successRate: similarExperiences.filter((e) => e.success).length / (similarExperiences.length || 1),
          improvements: this.identifyImprovements(executePhase.content),
        },
      };
    } catch (error) {
      return {
        type: "reflect",
        timestamp: startTime,
        content: `Reflection failed: ${error}`,
      };
    }
  }

  /**
   * Execute task using offline mode (local GGUF model)
   */
  private async executeOffline(taskDescription: string): Promise<string> {
    // Placeholder for llama.rn integration
    // In production, this would call the local GGUF model via llama.rn
    return `[OFFLINE MODE] Processing: ${taskDescription}\n\nNote: Local GGUF model integration pending.`;
  }

  /**
   * Execute task using cloud mode (API)
   */
  private async executeCloud(taskDescription: string): Promise<string> {
    const provider = this.mode.activeProvider || "openai";
    const apiKey = await APIVault.getKey(provider as any);

    if (!apiKey) {
      throw new Error(`No API key found for ${provider}`);
    }

    switch (provider) {
      case "openai":
        return await this.callOpenAI(taskDescription, apiKey);
      case "anthropic":
        return await this.callAnthropic(taskDescription, apiKey);
      case "gemini":
        return await this.callGemini(taskDescription, apiKey);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(taskDescription: string, apiKey: string): Promise<string> {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "user",
              content: taskDescription,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "No response from OpenAI";
    } catch (error) {
      throw new Error(`OpenAI call failed: ${error}`);
    }
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(taskDescription: string, apiKey: string): Promise<string> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: taskDescription,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content[0]?.text || "No response from Anthropic";
    } catch (error) {
      throw new Error(`Anthropic call failed: ${error}`);
    }
  }

  /**
   * Call Gemini API
   */
  private async callGemini(taskDescription: string, apiKey: string): Promise<string> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: taskDescription,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || "No response from Gemini";
    } catch (error) {
      throw new Error(`Gemini call failed: ${error}`);
    }
  }

  /**
   * Analyze and create plan
   */
  private async analyzePlan(taskDescription: string): Promise<string> {
    return `Plan for: "${taskDescription}"\n1. Analyze requirements\n2. Identify approach\n3. Execute steps\n4. Verify results`;
  }

  /**
   * Identify task type
   */
  private identifyTaskType(taskDescription: string): string {
    const lower = taskDescription.toLowerCase();
    if (lower.includes("question") || lower.includes("ask")) return "question";
    if (lower.includes("analyze") || lower.includes("analyze")) return "analysis";
    if (lower.includes("generate") || lower.includes("create")) return "generation";
    if (lower.includes("summarize")) return "summarization";
    return "general";
  }

  /**
   * Estimate task complexity
   */
  private estimateComplexity(taskDescription: string): "low" | "medium" | "high" {
    const length = taskDescription.length;
    if (length < 50) return "low";
    if (length < 200) return "medium";
    return "high";
  }

  /**
   * Identify required tools
   */
  private identifyRequiredTools(taskDescription: string): string[] {
    const tools: string[] = [];
    if (taskDescription.toLowerCase().includes("file")) tools.push("file_system");
    if (taskDescription.toLowerCase().includes("copy") || taskDescription.toLowerCase().includes("clipboard"))
      tools.push("clipboard");
    return tools;
  }

  /**
   * Self-correction logic
   */
  private async selfCorrect(result: string, pastExperiences: Experience[]): Promise<string> {
    const successRate = pastExperiences.filter((e) => e.success).length / (pastExperiences.length || 1);
    return `Reflection: Task completed. Success rate for similar tasks: ${(successRate * 100).toFixed(1)}%`;
  }

  /**
   * Identify improvements
   */
  private identifyImprovements(result: string): string[] {
    if (result.includes("error")) {
      return ["Handle error cases better", "Add retry logic"];
    }
    return ["Task completed successfully"];
  }

  /**
   * Get current thought stream
   */
  getCurrentThoughtStream(): ThoughtStream | null {
    return this.currentThoughtStream;
  }

  /**
   * Set agent mode
   */
  setMode(mode: AgentMode): void {
    this.mode = mode;
  }

  /**
   * Get agent mode
   */
  getMode(): AgentMode {
    return this.mode;
  }
}

// Export singleton instance
export const agent = new AutonomousAgent();
