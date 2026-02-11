/**
 * Home Screen
 * Main agent interface with chat input and task execution
 */

import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAgent } from "@/app/providers/agent-provider";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  type: "user" | "agent";
  content: string;
  timestamp: number;
}

export function HomeScreen() {
  const colors = useColors();
  const { mode, isProcessing, executeTask, currentThoughtStream, recentExperiences } = useAgent();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      setError(null);

      // Add user message
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        type: "user",
        content: inputText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputText("");

      // Execute task
      const experience = await executeTask(inputText);

      // Add agent response
      const agentMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        type: "agent",
        content: experience.output,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, agentMessage]);

      // Scroll to bottom
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setError(String(err));
    }
  };

  const getModeLabel = () => {
    if (mode.type === "cloud") {
      return `Cloud: ${mode.activeProvider?.toUpperCase() || "Unknown"}`;
    }
    return "Offline Mode";
  };

  const getModeColor = () => {
    return mode.type === "cloud" ? colors.success : colors.warning;
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <View className="flex-1 flex-col">
        {/* Header */}
        <View className="px-4 py-3 border-b border-border">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-foreground">Raju-ai- Agent</Text>
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getModeColor() + "20" }}
            >
              <Text className="text-xs font-semibold" style={{ color: getModeColor() }}>
                {getModeLabel()}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-muted mt-1">Autonomous AI Agent with Memory</Text>
        </View>

        {/* Messages Area */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-lg font-semibold text-foreground mb-2">Welcome to Raju-ai-</Text>
              <Text className="text-sm text-muted text-center px-4">
                Ask me anything. I'll use my reasoning loop to think through your request and learn from every interaction.
              </Text>
            </View>
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                className={cn("mb-3 flex-row", msg.type === "user" ? "justify-end" : "justify-start")}
              >
                <View
                  className={cn(
                    "max-w-xs px-3 py-2 rounded-lg",
                    msg.type === "user"
                      ? "bg-primary"
                      : "bg-surface border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm",
                      msg.type === "user" ? "text-background" : "text-foreground"
                    )}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))
          )}

          {isProcessing && (
            <View className="flex-row items-center mb-3">
              <ActivityIndicator color={colors.primary} size="small" />
              <Text className="text-sm text-muted ml-2">Agent thinking...</Text>
            </View>
          )}

          {error && (
            <View className="bg-error bg-opacity-10 border border-error rounded-lg p-3 mb-3">
              <Text className="text-sm text-error">{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Thought Stream Preview */}
        {currentThoughtStream && (
          <View className="px-4 py-3 bg-surface border-t border-border">
            <Text className="text-xs font-semibold text-muted mb-2">THOUGHT STREAM</Text>
            <View className="flex-row gap-2">
              {currentThoughtStream.phases.map((phase, idx) => (
                <View
                  key={idx}
                  className="flex-1 bg-background rounded px-2 py-1"
                  style={{ borderLeftWidth: 2, borderLeftColor: colors.primary }}
                >
                  <Text className="text-xs font-semibold text-foreground capitalize">{phase.type}</Text>
                  <Text className="text-xs text-muted mt-1" numberOfLines={2}>
                    {phase.content.substring(0, 40)}...
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Input Area */}
        <View className="px-4 py-3 border-t border-border bg-background">
          <View className="flex-row gap-2 items-center">
            <TextInput
              className="flex-1 bg-surface text-foreground px-3 py-2 rounded-lg text-sm border border-border"
              placeholder="Ask me anything..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              editable={!isProcessing}
              multiline
              style={{ maxHeight: 100 }}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={isProcessing || !inputText.trim()}
              className="bg-primary px-4 py-2 rounded-lg"
              style={{ opacity: isProcessing || !inputText.trim() ? 0.5 : 1 }}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-background font-semibold">Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
