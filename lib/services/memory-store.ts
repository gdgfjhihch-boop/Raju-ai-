/**
 * Vector Memory Store Service
 * Manages persistent storage of agent experiences and vector embeddings
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Experience, ThoughtStream } from "@/lib/types";

const EXPERIENCES_STORAGE_KEY = "raju_experiences";
const MEMORY_STATS_KEY = "raju_memory_stats";
const MAX_EXPERIENCES = 1000;

export interface MemoryStats {
  totalExperiences: number;
  totalMemorySize: number;
  lastCleanup: number;
}

export class MemoryStore {
  /**
   * Initialize memory store
   */
  static async initialize(): Promise<void> {
    try {
      const stats = await AsyncStorage.getItem(MEMORY_STATS_KEY);
      if (!stats) {
        const initialStats: MemoryStats = {
          totalExperiences: 0,
          totalMemorySize: 0,
          lastCleanup: Date.now(),
        };
        await AsyncStorage.setItem(MEMORY_STATS_KEY, JSON.stringify(initialStats));
      }
    } catch (error) {
      console.error("Failed to initialize memory store:", error);
    }
  }

  /**
   * Store a new experience in memory
   */
  static async storeExperience(experience: Experience): Promise<void> {
    try {
      const experiences = await this.getAllExperiences();

      // Check if we need to cleanup old experiences
      if (experiences.length >= MAX_EXPERIENCES) {
        await this.cleanupOldExperiences();
      }

      experiences.push(experience);
      await AsyncStorage.setItem(EXPERIENCES_STORAGE_KEY, JSON.stringify(experiences));

      // Update stats
      await this.updateStats();
    } catch (error) {
      console.error("Failed to store experience:", error);
      throw new Error("Failed to store experience");
    }
  }

  /**
   * Get all stored experiences
   */
  static async getAllExperiences(): Promise<Experience[]> {
    try {
      const data = await AsyncStorage.getItem(EXPERIENCES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to get experiences:", error);
      return [];
    }
  }

  /**
   * Get experience by ID
   */
  static async getExperience(experienceId: string): Promise<Experience | null> {
    try {
      const experiences = await this.getAllExperiences();
      return experiences.find((e) => e.id === experienceId) || null;
    } catch (error) {
      console.error("Failed to get experience:", error);
      return null;
    }
  }

  /**
   * Search experiences by task description
   */
  static async searchExperiences(query: string): Promise<Experience[]> {
    try {
      const experiences = await this.getAllExperiences();
      const lowerQuery = query.toLowerCase();
      return experiences.filter(
        (e) =>
          e.taskDescription.toLowerCase().includes(lowerQuery) ||
          e.input.toLowerCase().includes(lowerQuery) ||
          e.output.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error("Failed to search experiences:", error);
      return [];
    }
  }

  /**
   * Get experiences by model
   */
  static async getExperiencesByModel(model: string): Promise<Experience[]> {
    try {
      const experiences = await this.getAllExperiences();
      return experiences.filter((e) => e.model === model);
    } catch (error) {
      console.error("Failed to get experiences by model:", error);
      return [];
    }
  }

  /**
   * Get experiences by mode (offline/cloud)
   */
  static async getExperiencesByMode(mode: "offline" | "cloud"): Promise<Experience[]> {
    try {
      const experiences = await this.getAllExperiences();
      return experiences.filter((e) => e.mode === mode);
    } catch (error) {
      console.error("Failed to get experiences by mode:", error);
      return [];
    }
  }

  /**
   * Get memory statistics
   */
  static async getMemoryStats(): Promise<MemoryStats> {
    try {
      const data = await AsyncStorage.getItem(MEMORY_STATS_KEY);
      if (!data) {
        const stats: MemoryStats = {
          totalExperiences: 0,
          totalMemorySize: 0,
          lastCleanup: Date.now(),
        };
        await AsyncStorage.setItem(MEMORY_STATS_KEY, JSON.stringify(stats));
        return stats;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to get memory stats:", error);
      return {
        totalExperiences: 0,
        totalMemorySize: 0,
        lastCleanup: Date.now(),
      };
    }
  }

  /**
   * Update memory statistics
   */
  private static async updateStats(): Promise<void> {
    try {
      const experiences = await this.getAllExperiences();
      const totalMemorySize = JSON.stringify(experiences).length;

      const stats: MemoryStats = {
        totalExperiences: experiences.length,
        totalMemorySize,
        lastCleanup: (await this.getMemoryStats()).lastCleanup,
      };

      await AsyncStorage.setItem(MEMORY_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error("Failed to update stats:", error);
    }
  }

  /**
   * Clean up old experiences (keep only the most recent 80% when limit is reached)
   */
  private static async cleanupOldExperiences(): Promise<void> {
    try {
      const experiences = await this.getAllExperiences();
      const keepCount = Math.floor(MAX_EXPERIENCES * 0.8);
      const sorted = experiences.sort((a, b) => b.timestamp - a.timestamp);
      const kept = sorted.slice(0, keepCount);

      await AsyncStorage.setItem(EXPERIENCES_STORAGE_KEY, JSON.stringify(kept));

      const stats = await this.getMemoryStats();
      stats.lastCleanup = Date.now();
      await AsyncStorage.setItem(MEMORY_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error("Failed to cleanup experiences:", error);
    }
  }

  /**
   * Delete a specific experience
   */
  static async deleteExperience(experienceId: string): Promise<void> {
    try {
      const experiences = await this.getAllExperiences();
      const filtered = experiences.filter((e) => e.id !== experienceId);
      await AsyncStorage.setItem(EXPERIENCES_STORAGE_KEY, JSON.stringify(filtered));
      await this.updateStats();
    } catch (error) {
      console.error("Failed to delete experience:", error);
      throw new Error("Failed to delete experience");
    }
  }

  /**
   * Clear all experiences
   */
  static async clearAllExperiences(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EXPERIENCES_STORAGE_KEY);
      const stats: MemoryStats = {
        totalExperiences: 0,
        totalMemorySize: 0,
        lastCleanup: Date.now(),
      };
      await AsyncStorage.setItem(MEMORY_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error("Failed to clear experiences:", error);
      throw new Error("Failed to clear experiences");
    }
  }

  /**
   * Export all experiences as JSON
   */
  static async exportExperiences(): Promise<string> {
    try {
      const experiences = await this.getAllExperiences();
      return JSON.stringify(experiences, null, 2);
    } catch (error) {
      console.error("Failed to export experiences:", error);
      throw new Error("Failed to export experiences");
    }
  }

  /**
   * Get success rate statistics
   */
  static async getSuccessRate(): Promise<{ successful: number; failed: number; rate: number }> {
    try {
      const experiences = await this.getAllExperiences();
      const successful = experiences.filter((e) => e.success).length;
      const failed = experiences.length - successful;
      const rate = experiences.length > 0 ? (successful / experiences.length) * 100 : 0;

      return { successful, failed, rate };
    } catch (error) {
      console.error("Failed to get success rate:", error);
      return { successful: 0, failed: 0, rate: 0 };
    }
  }
}
