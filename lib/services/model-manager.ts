/**
 * Model Manager Service
 * Handles GGUF model downloading, verification, and management
 */

import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Model, DownloadProgress, FileIntegrityCheck, StorageInfo } from "@/lib/types";

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;
const MODELS_STORAGE_KEY = "raju_models";

export class ModelManager {
  /**
   * Initialize models directory
   */
  static async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(MODELS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error("Failed to initialize models directory:", error);
      throw new Error("Failed to initialize models directory");
    }
  }

  /**
   * Get available storage space
   */
  static async getStorageInfo(): Promise<StorageInfo> {
    try {
      // Note: React Native doesn't have direct access to storage info
      // This is a placeholder implementation
      return {
        totalSpace: 0,
        freeSpace: 0,
        usedSpace: 0,
      };
    } catch (error) {
      console.error("Failed to get storage info:", error);
      throw new Error("Failed to get storage info");
    }
  }

  /**
   * Download a GGUF model from URL
   */
  static async downloadModel(
    url: string,
    modelName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<Model> {
    try {
      // Check storage before downloading
      const storage = await this.getStorageInfo();
      if (storage.freeSpace < 100 * 1024 * 1024) {
        // Less than 100MB free
        throw new Error("Insufficient storage space");
      }

      const modelPath = `${MODELS_DIR}${modelName}.gguf`;
      const downloadResumable = FileSystem.createDownloadResumable(url, modelPath, {}, (progress) => {
        const { totalBytesExpectedToWrite, totalBytesWritten } = progress;
        const percentage = (totalBytesWritten / totalBytesExpectedToWrite) * 100;
        const speed = totalBytesWritten / (Date.now() / 1000);
        const eta = (totalBytesExpectedToWrite - totalBytesWritten) / speed;

        onProgress?.({
          totalBytes: totalBytesExpectedToWrite,
          downloadedBytes: totalBytesWritten,
          percentage,
          speed,
          eta,
        });
      });

      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error("Download failed");
      }

      // Verify file integrity
      const integrityCheck = await this.verifyFileIntegrity(modelPath);
      if (!integrityCheck.isValid) {
        await FileSystem.deleteAsync(modelPath);
        throw new Error(`File integrity check failed: ${integrityCheck.error}`);
      }

      // Create model record
      const model: Model = {
        id: `model_${Date.now()}`,
        name: modelName,
        url,
        fileSize: integrityCheck.fileSize,
        downloadedAt: Date.now(),
        localPath: modelPath,
        format: "gguf",
        isActive: false,
      };

      // Save model record
      await this.saveModel(model);

      return model;
    } catch (error) {
      console.error("Failed to download model:", error);
      throw error;
    }
  }

  /**
   * Verify file integrity
   */
  static async verifyFileIntegrity(filePath: string): Promise<FileIntegrityCheck> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return {
          fileSize: 0,
          isValid: false,
          error: "File does not exist",
        };
      }

      // Check file size is reasonable (at least 1MB for a model)
      const fileSizeInMB = (fileInfo.size || 0) / (1024 * 1024);
      if (fileSizeInMB < 1) {
        return {
          fileSize: fileInfo.size || 0,
          isValid: false,
          error: "File size too small",
        };
      }

      return {
        fileSize: fileInfo.size || 0,
        isValid: true,
      };
    } catch (error) {
      return {
        fileSize: 0,
        isValid: false,
        error: String(error),
      };
    }
  }

  /**
   * Save model record to storage
   */
  private static async saveModel(model: Model): Promise<void> {
    try {
      const models = await this.getAllModels();
      models.push(model);
      await AsyncStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(models));
    } catch (error) {
      console.error("Failed to save model record:", error);
      throw new Error("Failed to save model record");
    }
  }

  /**
   * Get all downloaded models
   */
  static async getAllModels(): Promise<Model[]> {
    try {
      const data = await AsyncStorage.getItem(MODELS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to get models:", error);
      return [];
    }
  }

  /**
   * Get a specific model by ID
   */
  static async getModel(modelId: string): Promise<Model | null> {
    try {
      const models = await this.getAllModels();
      return models.find((m) => m.id === modelId) || null;
    } catch (error) {
      console.error("Failed to get model:", error);
      return null;
    }
  }

  /**
   * Set active model
   */
  static async setActiveModel(modelId: string): Promise<void> {
    try {
      const models = await this.getAllModels();
      const updatedModels = models.map((m) => ({
        ...m,
        isActive: m.id === modelId,
      }));
      await AsyncStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(updatedModels));
    } catch (error) {
      console.error("Failed to set active model:", error);
      throw new Error("Failed to set active model");
    }
  }

  /**
   * Get active model
   */
  static async getActiveModel(): Promise<Model | null> {
    try {
      const models = await this.getAllModels();
      return models.find((m) => m.isActive) || null;
    } catch (error) {
      console.error("Failed to get active model:", error);
      return null;
    }
  }

  /**
   * Delete a model
   */
  static async deleteModel(modelId: string): Promise<void> {
    try {
      const model = await this.getModel(modelId);
      if (!model) {
        throw new Error("Model not found");
      }

      // Delete file
      try {
        await FileSystem.deleteAsync(model.localPath);
      } catch {
        console.warn("Failed to delete model file");
      }

      // Remove from storage
      const models = await this.getAllModels();
      const updatedModels = models.filter((m) => m.id !== modelId);
      await AsyncStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(updatedModels));
    } catch (error) {
      console.error("Failed to delete model:", error);
      throw error;
    }
  }
}
