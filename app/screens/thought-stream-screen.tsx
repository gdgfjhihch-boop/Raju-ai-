/**
 * Thought Stream Screen
 * Real-time visualization of agent reasoning loop
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Share } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAgent } from "@/app/providers/agent-provider";
import { cn } from "@/lib/utils";

export function ThoughtStreamScreen() {
  const colors = useColors();
  const { currentThoughtStream, recentExperiences } = useAgent();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleShare = async () => {
    if (!currentThoughtStream) return;

    try {
      const text = currentThoughtStream.phases
        .map((phase) => `[${phase.type.toUpperCase()}]\n${phase.content}`)
        .join("\n\n");

      await Share.share({
        message: text,
        title: "Thought Stream",
      });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const getPhaseColor = (type: string) => {
    switch (type) {
      case "plan":
        return colors.primary;
      case "execute":
        return colors.success;
      case "reflect":
        return colors.warning;
      default:
        return colors.foreground;
    }
  };

  const getPhaseIcon = (type: string) => {
    switch (type) {
      case "plan":
        return "📋";
      case "execute":
        return "⚡";
      case "reflect":
        return "🧠";
      default:
        return "•";
    }
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">Thought Stream</Text>
          <Text className="text-sm text-muted mt-1">Real-time agent reasoning visualization</Text>
        </View>

        {/* Current Thought Stream */}
        {currentThoughtStream ? (
          <View className="px-4 py-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-sm font-semibold text-foreground">Current Reasoning</Text>
              <TouchableOpacity
                onPress={handleShare}
                className="bg-primary bg-opacity-20 px-3 py-1 rounded"
              >
                <Text className="text-xs font-semibold text-primary">Share</Text>
              </TouchableOpacity>
            </View>

            {/* Timeline */}
            {currentThoughtStream.phases.map((phase, idx) => (
              <View key={idx} className="mb-3">
                {/* Phase Header */}
                <TouchableOpacity
                  onPress={() =>
                    setExpandedPhase(
                      expandedPhase === phase.type ? null : phase.type
                    )
                  }
                  className="bg-surface rounded-lg p-3 border border-border flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text style={{ color: getPhaseColor(phase.type) }}>
                      {getPhaseIcon(phase.type)}
                    </Text>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground capitalize">
                        {phase.type} Phase
                      </Text>\n                      <Text className="text-xs text-muted">
                      {formatTime(phase.timestamp)}
                    </Text>
                    </View>
                  </View>
                  <Text className="text-lg text-muted">
                    {expandedPhase === phase.type ? "−" : "+"}
                  </Text>
                </TouchableOpacity>

                {/* Phase Content */}
                {expandedPhase === phase.type && (
                  <View className="bg-background rounded-b-lg p-3 border border-t-0 border-border">
                    <Text className="text-sm text-foreground leading-relaxed mb-3">
                      {phase.content}
                    </Text>

                    {/* Phase Details */}
                    {phase.details && (
                      <View className="bg-surface rounded p-2 border border-border">
                        {Object.entries(phase.details).map(([key, value]) => (
                          <View key={key} className="flex-row justify-between py-1">
                            <Text className="text-xs text-muted capitalize">
                              {key.replace(/_/g, " ")}:
                            </Text>
                            <Text className="text-xs text-foreground font-semibold">
                              {typeof value === "number"
                                ? value.toFixed(2)
                                : String(value)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Connection Line */}
                {idx < currentThoughtStream.phases.length - 1 && (
                  <View className="h-4 items-center">
                    <View
                      className="w-0.5 h-full"
                      style={{ backgroundColor: colors.border }}
                    />
                  </View>
                )}
              </View>
            ))}

            {/* Duration */}
            {currentThoughtStream.endTime && (
              <View className="bg-surface rounded-lg p-3 border border-border mt-4">
                <Text className="text-xs text-muted mb-1">Total Duration</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {formatDuration(
                    currentThoughtStream.endTime - currentThoughtStream.startTime
                  )}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="px-4 py-8 items-center justify-center">
            <Text className="text-lg font-semibold text-foreground mb-2">
              No Active Thought Stream
            </Text>
            <Text className="text-sm text-muted text-center">
              Execute a task to see the agent's reasoning process in real-time
            </Text>
          </View>
        )}

        {/* Recent Thought Streams */}
        {recentExperiences.length > 0 && (
          <View className="px-4 py-4 border-t border-border">
            <Text className="text-sm font-semibold text-foreground mb-3">
              Recent Reasoning ({recentExperiences.length})
            </Text>

            {recentExperiences.map((exp) => (
              <View
                key={exp.id}
                className="bg-surface rounded-lg p-3 border border-border mb-2"
              >
                <Text className="text-sm font-semibold text-foreground mb-1">
                  {exp.taskDescription.substring(0, 50)}
                  {exp.taskDescription.length > 50 ? "..." : ""}
                </Text>

                <View className="flex-row gap-2 mb-2">
                  {exp.reasoning.phases.map((phase, idx) => (
                    <View
                      key={idx}
                      className="flex-1 rounded px-2 py-1"
                      style={{ backgroundColor: getPhaseColor(phase.type) + "20" }}
                    >
                      <Text
                        className="text-xs font-semibold text-center capitalize"
                        style={{ color: getPhaseColor(phase.type) }}
                      >
                        {phase.type}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-muted">
                    {new Date(exp.timestamp).toLocaleString()}
                  </Text>
                  <View
                    className={cn(
                      "px-2 py-1 rounded",
                      exp.success
                        ? "bg-success bg-opacity-20"
                        : "bg-error bg-opacity-20"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-semibold",
                        exp.success ? "text-success" : "text-error"
                      )}
                    >
                      {exp.success ? "Success" : "Failed"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
