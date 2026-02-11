/**
 * Memory Browser Screen
 * Search and view stored agent experiences
 */

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MemoryStore, type MemoryStats } from "@/lib/services/memory-store";
import type { Experience } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MemoryBrowserScreen() {
  const colors = useColors();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [filteredExperiences, setFilteredExperiences] = useState<Experience[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [successRate, setSuccessRate] = useState(0);

  useEffect(() => {
    loadMemory();
  }, []);

  useEffect(() => {
    filterExperiences();
  }, [searchQuery, experiences]);

  const loadMemory = async () => {
    try {
      const exps = await MemoryStore.getAllExperiences();
      setExperiences(exps);

      const stats = await MemoryStore.getMemoryStats();
      setMemoryStats(stats);

      const rate = await MemoryStore.getSuccessRate();
      setSuccessRate(rate.rate);
    } catch (error) {
      console.error("Failed to load memory:", error);
    }
  };

  const filterExperiences = () => {
    if (!searchQuery.trim()) {
      setFilteredExperiences(experiences);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = experiences.filter(
      (exp) =>
        exp.taskDescription.toLowerCase().includes(query) ||
        exp.input.toLowerCase().includes(query) ||
        exp.output.toLowerCase().includes(query)
    );
    setFilteredExperiences(filtered);
  };

  const handleClearMemory = () => {
    Alert.alert("Clear All Experiences", "This will permanently delete all stored experiences. Are you sure?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Clear",
        onPress: async () => {
          try {
            await MemoryStore.clearAllExperiences();
            setExperiences([]);
            setFilteredExperiences([]);
            setSelectedExperience(null);
            Alert.alert("Success", "All experiences cleared");
            await loadMemory();
          } catch (error) {
            Alert.alert("Error", String(error));
          }
        },
      },
    ]);
  };

  const handleDeleteExperience = async (experienceId: string) => {
    try {
      await MemoryStore.deleteExperience(experienceId);
      await loadMemory();
      setSelectedExperience(null);
      Alert.alert("Success", "Experience deleted");
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      {selectedExperience ? (
        // Experience Detail View
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <View className="px-4 py-4 border-b border-border flex-row items-center gap-2">
            <TouchableOpacity onPress={() => setSelectedExperience(null)}>
              <Text className="text-xl text-primary">←</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground flex-1">Experience Detail</Text>
          </View>

          <View className="px-4 py-4">
            <View className="bg-surface rounded-lg p-4 border border-border mb-4">
              <Text className="text-sm font-semibold text-muted mb-1">TASK</Text>
              <Text className="text-sm text-foreground leading-relaxed">
                {selectedExperience.taskDescription}
              </Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border mb-4">
              <Text className="text-sm font-semibold text-muted mb-1">INPUT</Text>
              <Text className="text-sm text-foreground leading-relaxed">
                {selectedExperience.input}
              </Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border mb-4">
              <Text className="text-sm font-semibold text-muted mb-1">OUTPUT</Text>
              <Text className="text-sm text-foreground leading-relaxed">
                {selectedExperience.output}
              </Text>
            </View>

            <View className="grid grid-cols-2 gap-2 mb-4">
              <View className="bg-surface rounded-lg p-3 border border-border">
                <Text className="text-xs text-muted mb-1">Mode</Text>
                <Text className="text-sm font-semibold text-foreground capitalize">
                  {selectedExperience.mode}
                </Text>
              </View>
              <View className="bg-surface rounded-lg p-3 border border-border">
                <Text className="text-xs text-muted mb-1">Model</Text>
                <Text className="text-sm font-semibold text-foreground">{selectedExperience.model}</Text>
              </View>
              <View className="bg-surface rounded-lg p-3 border border-border">
                <Text className="text-xs text-muted mb-1">Status</Text>
                <Text
                  className={cn(
                    "text-sm font-semibold",
                    selectedExperience.success ? "text-success" : "text-error"
                  )}
                >
                  {selectedExperience.success ? "Success" : "Failed"}
                </Text>
              </View>
              <View className="bg-surface rounded-lg p-3 border border-border">
                <Text className="text-xs text-muted mb-1">Timestamp</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {new Date(selectedExperience.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleDeleteExperience(selectedExperience.id)}
              className="bg-error bg-opacity-20 px-4 py-3 rounded-lg"
            >
              <Text className="text-sm font-semibold text-error text-center">Delete Experience</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        // Memory List View
        <View className="flex-1 flex-col">
          {/* Header */}
          <View className="px-4 py-4 border-b border-border">
            <Text className="text-2xl font-bold text-foreground">Memory Browser</Text>
            <Text className="text-sm text-muted mt-1">Search and view stored experiences</Text>
          </View>

          {/* Stats */}
          {memoryStats && (
            <View className="px-4 py-3 border-b border-border flex-row gap-2">
              <View className="flex-1 bg-surface rounded-lg p-2 border border-border">
                <Text className="text-xs text-muted">Total Experiences</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {memoryStats.totalExperiences}
                </Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-2 border border-border">
                <Text className="text-xs text-muted">Memory Size</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {formatFileSize(memoryStats.totalMemorySize)}
                </Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-2 border border-border">
                <Text className="text-xs text-muted">Success Rate</Text>
                <Text className="text-sm font-semibold text-success">
                  {successRate.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}

          {/* Search */}
          <View className="px-4 py-3 border-b border-border">
            <TextInput
              className="bg-surface text-foreground px-3 py-2 rounded-lg text-sm border border-border"
              placeholder="Search experiences..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Experiences List */}
          <FlatList
            data={filteredExperiences}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedExperience(item)}
                className="px-4 py-2"
              >
                <View className="bg-surface rounded-lg p-3 border border-border">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground mb-1">
                        {item.taskDescription.substring(0, 50)}
                        {item.taskDescription.length > 50 ? "..." : ""}
                      </Text>
                      <Text className="text-xs text-muted">
                        {new Date(item.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        "px-2 py-1 rounded",
                        item.success
                          ? "bg-success bg-opacity-20"
                          : "bg-error bg-opacity-20"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-xs font-semibold",
                          item.success ? "text-success" : "text-error"
                        )}
                      >
                        {item.success ? "✓" : "✗"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-1">
                    <View className="bg-background rounded px-2 py-1 flex-1">
                      <Text className="text-xs text-muted capitalize">{item.mode}</Text>
                    </View>
                    <View className="bg-background rounded px-2 py-1 flex-1">
                      <Text className="text-xs text-muted">{item.model}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="px-4 py-8 items-center justify-center">
                <Text className="text-sm text-muted text-center">
                  {searchQuery ? "No experiences match your search" : "No experiences stored yet"}
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
            scrollEnabled={true}
          />

          {/* Clear Button */}
          {experiences.length > 0 && (
            <View className="px-4 py-3 border-t border-border">
              <TouchableOpacity
                onPress={handleClearMemory}
                className="bg-error bg-opacity-20 px-4 py-3 rounded-lg"
              >
                <Text className="text-sm font-semibold text-error text-center">
                  Clear All Experiences
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}
