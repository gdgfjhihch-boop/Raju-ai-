/**
 * Developer Settings Screen
 * Secure API key vault for cloud mode
 */

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { APIVault } from "@/lib/services/api-vault";
import { useAgent } from "@/app/providers/agent-provider";
import { cn } from "@/lib/utils";

type Provider = "openai" | "anthropic" | "gemini";

interface APIKeyState {
  openai: string;
  anthropic: string;
  gemini: string;
}

export function DeveloperSettingsScreen() {
  const colors = useColors();
  const { mode, setMode } = useAgent();
  const [apiKeys, setApiKeys] = useState<APIKeyState>({
    openai: "",
    anthropic: "",
    gemini: "",
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    gemini: false,
  });
  const [isCloudMode, setIsCloudMode] = useState(mode.type === "cloud");
  const [selectedProvider, setSelectedProvider] = useState<Provider>("openai");
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<Provider, boolean | null>>({
    openai: null,
    anthropic: null,
    gemini: null,
  });

  useEffect(() => {
    loadStoredKeys();
  }, []);

  const loadStoredKeys = async () => {
    try {
      const providers: Provider[] = ["openai", "anthropic", "gemini"];
      const keys: APIKeyState = { openai: "", anthropic: "", gemini: "" };

      for (const provider of providers) {
        const key = await APIVault.getKey(provider);
        if (key) {
          keys[provider] = key;
        }
      }

      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to load API keys:", error);
    }
  };

  const handleSaveKey = async (provider: Provider) => {
    try {
      const key = apiKeys[provider];
      if (!key.trim()) {
        Alert.alert("Error", "Please enter an API key");
        return;
      }

      await APIVault.storeKey(provider, key);
      Alert.alert("Success", `${provider.toUpperCase()} API key saved securely`);
    } catch (error) {
      Alert.alert("Error", `Failed to save API key: ${error}`);
    }
  };

  const handleTestKey = async (provider: Provider) => {
    try {
      setIsTesting(true);
      const key = apiKeys[provider];

      if (!key.trim()) {
        Alert.alert("Error", "Please enter an API key first");
        return;
      }

      const isValid = await APIVault.verifyKey(provider, key);
      setTestResults((prev) => ({ ...prev, [provider]: isValid }));

      if (isValid) {
        Alert.alert("Success", `${provider.toUpperCase()} API key is valid`);
      } else {
        Alert.alert("Error", `${provider.toUpperCase()} API key is invalid`);
      }
    } catch (error) {
      Alert.alert("Error", `Failed to test API key: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteKey = async (provider: Provider) => {
    Alert.alert("Delete API Key", `Are you sure you want to delete your ${provider.toUpperCase()} API key?`, [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await APIVault.deleteKey(provider);
            setApiKeys((prev) => ({ ...prev, [provider]: "" }));
            setTestResults((prev) => ({ ...prev, [provider]: null }));
            Alert.alert("Success", "API key deleted");
          } catch (error) {
            Alert.alert("Error", String(error));
          }
        },
      },
    ]);
  };

  const handleToggleCloudMode = (value: boolean) => {
    setIsCloudMode(value);
    if (value) {
      setMode({
        type: "cloud",
        activeProvider: selectedProvider,
      });
    } else {
      setMode({
        type: "offline",
      });
    }
  };

  const renderKeyInput = (provider: Provider) => {
    return (
      <View key={provider} className="mb-4 bg-surface rounded-lg p-4 border border-border">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-sm font-semibold text-foreground uppercase">{provider}</Text>
          <View
            className={cn(
              "px-2 py-1 rounded",
              apiKeys[provider]
                ? "bg-success bg-opacity-20"
                : "bg-warning bg-opacity-20"
            )}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                apiKeys[provider] ? "text-success" : "text-warning"
              )}
            >
              {apiKeys[provider] ? "Stored" : "Not Set"}
            </Text>
          </View>
        </View>

        <TextInput
          className="bg-background text-foreground px-3 py-2 rounded text-sm border border-border mb-2"
          placeholder={`Enter ${provider.toUpperCase()} API key`}
          placeholderTextColor={colors.muted}
          value={apiKeys[provider]}
          onChangeText={(text) =>
            setApiKeys((prev) => ({ ...prev, [provider]: text }))
          }
          secureTextEntry={!showKeys[provider]}
          editable={!isCloudMode || selectedProvider !== provider}
        />

        <View className="flex-row gap-2 mb-2">
          <TouchableOpacity
            onPress={() =>
              setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
            }
            className="flex-1 bg-primary bg-opacity-20 px-3 py-2 rounded"
          >
            <Text className="text-xs font-semibold text-primary text-center">
              {showKeys[provider] ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSaveKey(provider)}
            className="flex-1 bg-success bg-opacity-20 px-3 py-2 rounded"
          >
            <Text className="text-xs font-semibold text-success text-center">Save</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => handleTestKey(provider)}
            disabled={isTesting || !apiKeys[provider]}
            className="flex-1 bg-warning bg-opacity-20 px-3 py-2 rounded"
            style={{ opacity: isTesting || !apiKeys[provider] ? 0.5 : 1 }}
          >
            <Text className="text-xs font-semibold text-warning text-center">
              {testResults[provider] === null
                ? "Test"
                : testResults[provider]
                ? "Valid"
                : "Invalid"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteKey(provider)}
            className="flex-1 bg-error bg-opacity-20 px-3 py-2 rounded"
          >
            <Text className="text-xs font-semibold text-error text-center">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">Developer Settings</Text>
          <Text className="text-sm text-muted mt-1">Secure API key vault for cloud mode</Text>
        </View>

        {/* Mode Toggle */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-sm font-semibold text-foreground">Cloud Mode</Text>
              <Text className="text-xs text-muted mt-1">Use cloud APIs instead of local models</Text>
            </View>
            <Switch
              value={isCloudMode}
              onValueChange={handleToggleCloudMode}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* Provider Selection */}
        {isCloudMode && (
          <View className="px-4 py-4 border-b border-border">
            <Text className="text-sm font-semibold text-foreground mb-3">Active Provider</Text>
            <View className="flex-row gap-2">
              {(["openai", "anthropic", "gemini"] as Provider[]).map((provider) => (
                <TouchableOpacity
                  key={provider}
                  onPress={() => {
                    setSelectedProvider(provider);
                    setMode({
                      type: "cloud",
                      activeProvider: provider,
                    });
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded",
                    selectedProvider === provider
                      ? "bg-primary"
                      : "bg-surface border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-semibold text-center uppercase",
                      selectedProvider === provider
                        ? "text-background"
                        : "text-foreground"
                    )}
                  >
                    {provider}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* API Keys */}
        <View className="px-4 py-4">
          <Text className="text-sm font-semibold text-foreground mb-3">API Keys</Text>
          <Text className="text-xs text-muted mb-3">
            Keys are encrypted and stored securely on your device
          </Text>

          {(["openai", "anthropic", "gemini"] as Provider[]).map((provider) =>
            renderKeyInput(provider)
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
