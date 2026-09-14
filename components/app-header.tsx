import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/use-colors";
import { getAppSettings, saveAppSettings, type AppSettings } from "@/lib/storage";

export function AppHeader() {
  const colors = useColors();
  const [settings, setSettings] = useState<AppSettings>({ displayName: "" });
  const [draftName, setDraftName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void getAppSettings().then((storedSettings) => {
      if (isMounted) setSettings(storedSettings);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const openSettings = () => {
    setDraftName(settings.displayName);
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      Alert.alert("入力が必要です", "使用者名または会社名を入力してください。");
      return;
    }

    try {
      setIsSaving(true);
      const savedSettings = await saveAppSettings(trimmedName);
      setSettings(savedSettings);
      setIsModalVisible(false);
      Alert.alert("保存しました", "使用者名・会社名を保存しました。");
    } catch (error) {
      console.error("Error saving app settings:", error);
      Alert.alert("保存エラー", "設定を保存できませんでした。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = settings.displayName || "使用者名を設定してください";

  return (
    <>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.identityArea}>
          <Text style={[styles.label, { color: colors.muted }]}>使用者名・会社名</Text>
          <Text
            numberOfLines={1}
            style={[
              styles.name,
              { color: settings.displayName ? colors.foreground : colors.warning },
            ]}
          >
            {displayName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="使用者名・会社名を設定"
          onPress={openSettings}
          style={({ pressed }) => [
            styles.settingsButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={styles.settingsButtonText}>設定</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>使用者名・会社名の設定</Text>
            <Text style={[styles.modalDescription, { color: colors.muted }]}>
              ZIPやCSVのファイル名・出力情報に使用されます。
            </Text>
            <TextInput
              autoFocus
              value={draftName}
              onChangeText={setDraftName}
              placeholder="例：〇〇整備工場"
              placeholderTextColor={colors.muted}
              maxLength={80}
              returnKeyType="done"
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsModalVisible(false)}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.cancelButton,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.cancelText, { color: colors.foreground }]}>キャンセル</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSave}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.primary, opacity: isSaving ? 0.5 : pressed ? 0.75 : 1 },
                ]}
              >
                <Text style={styles.saveText}>{isSaving ? "保存中…" : "保存"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 58,
    paddingBottom: 10,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  identityArea: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  settingsButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 16,
  },
  settingsButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    maxWidth: 520,
    padding: 22,
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 17,
    marginTop: 18,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 18,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 116,
    paddingHorizontal: 18,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
  saveText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
