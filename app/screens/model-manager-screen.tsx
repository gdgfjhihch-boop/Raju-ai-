/**
 * Model Manager Screen
 * Download, verify, and manage GGUF models
 */

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ModelManager } from "@/lib/services/model-manager";
import type { Model, DownloadProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ModelManagerScreen() {
  const colors = useColors();
  const [models, setModels] = useState<Model[]>([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const allModels = await ModelManager.getAllModels();
      setModels(allModels);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDownloadModel = async () => {
    if (!downloadUrl.trim() || !modelName.trim()) {
      Alert.alert("Error", "Please enter both URL and model name");
      return;
    }

    try {
      setError(null);
      setIsDownloading(true);

      const model = await ModelManager.downloadModel(downloadUrl, modelName, (progress) => {
        setDownloadProgress(progress);
      });

      setModels((prev) => [...prev, model]);
      setDownloadUrl("");
      setModelName("");
      setDownloadProgress(null);

      Alert.alert("Success", `Model "${modelName}" downloaded successfully`);
    } catch (err) {
      setError(String(err));
      Alert.alert("Error", `Failed to download model: ${err}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSetActiveModel = async (modelId: string) => {
    try {
      await ModelManager.setActiveModel(modelId);
      await loadModels();
      Alert.alert("Success", "Model activated");
    } catch (err) {
      Alert.alert("Error", String(err));
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    Alert.alert("Delete Model", "Are you sure you want to delete this model?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await ModelManager.deleteModel(modelId);
            await loadModels();
            Alert.alert("Success", "Model deleted");
          } catch (err) {
            Alert.alert("Error", String(err));
          }
        },
      },
    ]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">Model Manager</Text>
          <Text className="text-sm text-muted mt-1">Download and manage GGUF models for offline use</Text>
        </View>

        {/* Download Section */}
        <View className="px-4 py-4 border-b border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">Download Model</Text>

          <TextInput
            className="bg-surface text-foreground px-3 py-2 rounded-lg text-sm border border-border mb-2"
            placeholder="Model name (e.g., mistral-7b)"
            placeholderTextColor={colors.muted}
            value={modelName}
            onChangeText={setModelName}
            editable={!isDownloading}
          />

          <TextInput
            className="bg-surface text-foreground px-3 py-2 rounded-lg text-sm border border-border mb-3"
            placeholder="Direct .gguf download URL"
            placeholderTextColor={colors.muted}
            value={downloadUrl}
            onChangeText={setDownloadUrl}
            editable={!isDownloading}
          />

          {downloadProgress && (
            <View className="mb-3 bg-surface rounded-lg p-3 border border-border">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-semibold text-foreground">Downloading...</Text>
                <Text className="text-sm text-muted">{downloadProgress.percentage.toFixed(1)}%</Text>
              </View>
              <View className="w-full h-2 bg-background rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary"
                  style={{ width: `${downloadProgress.percentage}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-xs text-muted">
                  {formatFileSize(downloadProgress.downloadedBytes)} / {formatFileSize(downloadProgress.totalBytes)}
                </Text>
                <Text className="text-xs text-muted">
                  {(downloadProgress.speed / 1024 / 1024).toFixed(1)} MB/s
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleDownloadModel}
            disabled={isDownloading || !downloadUrl.trim() || !modelName.trim()}
            className="bg-primary px-4 py-3 rounded-lg flex-row items-center justify-center"
            style={{ opacity: isDownloading || !downloadUrl.trim() || !modelName.trim() ? 0.5 : 1 }}
          >
            {isDownloading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-background font-semibold">Download Model</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View className="mx-4 mt-4 bg-error bg-opacity-10 border border-error rounded-lg p-3">
            <Text className="text-sm text-error">{error}</Text>
          </View>
        )}

        {/* Models List */}
        <View className="px-4 py-4">
          <Text className="text-lg font-semibold text-foreground mb-3">
            Downloaded Models ({models.length})
          </Text>

          {models.length === 0 ? (
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted text-center">No models downloaded yet</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={models}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className="bg-surface rounded-lg p-3 mb-2 border border-border">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                        {item.isActive && (
                          <View className="bg-success bg-opacity-20 px-2 py-1 rounded">
                            <Text className="text-xs font-semibold text-success">Active</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-muted">{formatFileSize(item.fileSize)}</Text>
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                    {!item.isActive && (
                      <TouchableOpacity
                        onPress={() => handleSetActiveModel(item.id)}
                        className="flex-1 bg-primary bg-opacity-20 px-3 py-2 rounded"
                      >
                        <Text className="text-xs font-semibold text-primary text-center">Activate</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteModel(item.id)}
                      className="flex-1 bg-error bg-opacity-20 px-3 py-2 rounded"
                    >
                      <Text className="text-xs font-semibold text-error text-center">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
