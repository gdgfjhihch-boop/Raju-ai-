/**
 * Secure API Key Vault Service
 * Stores and manages API keys using expo-secure-store encryption
 */

import * as SecureStore from "expo-secure-store";
import type { APIKey } from "@/lib/types";

const API_KEY_PREFIX = "raju_api_key_";

export class APIVault {
  /**
   * Store an API key securely
   */
  static async storeKey(provider: "openai" | "anthropic" | "gemini", key: string): Promise<void> {
    try {
      const storageKey = `${API_KEY_PREFIX}${provider}`;
      await SecureStore.setItemAsync(storageKey, key);
    } catch (error) {
      console.error(`Failed to store ${provider} API key:`, error);
      throw new Error(`Failed to store API key for ${provider}`);
    }
  }

  /**
   * Retrieve an API key from secure storage
   */
  static async getKey(provider: "openai" | "anthropic" | "gemini"): Promise<string | null> {
    try {
      const storageKey = `${API_KEY_PREFIX}${provider}`;
      const key = await SecureStore.getItemAsync(storageKey);
      return key || null;
    } catch (error) {
      console.error(`Failed to retrieve ${provider} API key:`, error);
      return null;
    }
  }

  /**
   * Delete an API key from secure storage
   */
  static async deleteKey(provider: "openai" | "anthropic" | "gemini"): Promise<void> {
    try {
      const storageKey = `${API_KEY_PREFIX}${provider}`;
      await SecureStore.deleteItemAsync(storageKey);
    } catch (error) {
      console.error(`Failed to delete ${provider} API key:`, error);
      throw new Error(`Failed to delete API key for ${provider}`);
    }
  }

  /**
   * Check if an API key exists
   */
  static async hasKey(provider: "openai" | "anthropic" | "gemini"): Promise<boolean> {
    const key = await this.getKey(provider);
    return key !== null;
  }

  /**
   * Verify API key validity by making a test request
   */
  static async verifyKey(provider: "openai" | "anthropic" | "gemini", key: string): Promise<boolean> {
    try {
      switch (provider) {
        case "openai":
          return await this.verifyOpenAIKey(key);
        case "anthropic":
          return await this.verifyAnthropicKey(key);
        case "gemini":
          return await this.verifyGeminiKey(key);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to verify ${provider} API key:`, error);
      return false;
    }
  }

  /**
   * Verify OpenAI API key
   */
  private static async verifyOpenAIKey(key: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Verify Anthropic API key
   */
  private static async verifyAnthropicKey(key: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
        },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Verify Gemini API key
   */
  private static async verifyGeminiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get all stored API keys (without exposing the actual keys)
   */
  static async getAllKeys(): Promise<APIKey[]> {
    const providers: Array<"openai" | "anthropic" | "gemini"> = ["openai", "anthropic", "gemini"];
    const keys: APIKey[] = [];

    for (const provider of providers) {
      const hasKey = await this.hasKey(provider);
      if (hasKey) {
        keys.push({
          provider,
          key: "***hidden***",
          isValid: true,
          lastVerified: Date.now(),
        });
      }
    }

    return keys;
  }

  /**
   * Clear all stored API keys
   */
  static async clearAllKeys(): Promise<void> {
    const providers: Array<"openai" | "anthropic" | "gemini"> = ["openai", "anthropic", "gemini"];
    for (const provider of providers) {
      try {
        await this.deleteKey(provider);
      } catch (error) {
        console.error(`Failed to clear ${provider} key:`, error);
      }
    }
  }
}
