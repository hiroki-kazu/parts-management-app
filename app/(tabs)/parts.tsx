/**
 * 部品マスタ管理画面
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { getParts, addPart, updatePart, deletePart, importPartsFromCSV, exportAllDataAsJSON, importAllDataFromJSON } from "@/lib/storage";
import { Part } from "@/lib/types";
import { cn } from "@/lib/utils";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MailComposer from "expo-mail-composer";

interface EditingPart extends Partial<Part> {
  id?: string;
  name?: string;
  partNumber?: string;
  unitPrice?: number;
  currentStock?: number;
  minStock?: number;
  allowDecimal?: boolean;
}

interface EditingPartText {
  currentStockText: string;
  minStockText: string;
}

export default function PartsScreen() {
  const [parts, setParts] = useState<Part[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPart, setEditingPart] = useState<EditingPart>({});
  const [editingPartText, setEditingPartText] = useState<EditingPartText>({
    currentStockText: "",
    minStockText: "",
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    try {
      const data = await getParts();
      setParts(data);
    } catch (error) {
      console.error("Error loading parts:", error);
    }
  };

  const handleAddPart = () => {
    setEditingPart({});
    setEditingPartText({
      currentStockText: "",
      minStockText: "",
    });
    setIsModalVisible(true);
  };

  const handleEditPart = (part: Part) => {
    setEditingPart(part);
    setEditingPartText({
      currentStockText: String(part.currentStock || ""),
      minStockText: String(part.minStock || ""),
    });
    setIsModalVisible(true);
  };

  const validateQuantityInput = (text: string, allowDecimal: boolean): string => {
    if (!allowDecimal) {
      return text.replace(/[^0-9]/g, "");
    }
    // 小数点入力を許可
    if (text === "") return "";
    if (text === ".") return "0.";
    
    // 小数点の重複を防止
    const parts = text.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }
    
    // 小数第1位までに制限
    if (parts.length === 2 && parts[1].length > 1) {
      return parts[0] + "." + parts[1].substring(0, 1);
    }
    
    return text.replace(/[^0-9.]/g, "");
  };

  const handleSavePart = async () => {
    try {
      if (!editingPart.name || !editingPart.partNumber) {
        Alert.alert("エラー", "部品名と品番は必須です");
        return;
      }

      if (editingPart.id) {
        // 編集
        await updatePart(editingPart.id, {
          name: editingPart.name,
          partNumber: editingPart.partNumber,
          unitPrice: editingPart.unitPrice || 0,
          currentStock: parseFloat(editingPartText.currentStockText) || 0,
          minStock: parseFloat(editingPartText.minStockText) || 0,
          allowDecimal: editingPart.allowDecimal || false,
        });
      } else {
        // 追加
        await addPart({
          name: editingPart.name,
          partNumber: editingPart.partNumber,
          unitPrice: editingPart.unitPrice || 0,
          currentStock: parseFloat(editingPartText.currentStockText) || 0,
          minStock: parseFloat(editingPartText.minStockText) || 0,
          allowDecimal: editingPart.allowDecimal || false,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsModalVisible(false);
      loadParts();
    } catch (error) {
      console.error("Error saving part:", error);
      Alert.alert("エラー", "部品の保存に失敗しました");
    }
  };

  const handleDeletePart = (part: Part) => {
    Alert.alert("削除確認", `「${part.name}」を削除してもよろしいですか？`, [
      { text: "キャンセル", onPress: () => {} },
      {
        text: "削除",
        onPress: async () => {
          try {
            await deletePart(part.id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadParts();
          } catch (error) {
            console.error("Error deleting part:", error);
            Alert.alert("エラー", "部品の削除に失敗しました");
          }
        },
      },
    ]);
  };

  const handleBackupEmail = async () => {
    try {
      const data = await exportAllDataAsJSON();
      const csvContent = data;
      const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, csvContent);
      
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [],
          subject: `部品在庫管理 バックアップ ${new Date().toLocaleDateString()}`,
          body: "添付したファイルを使用してデータを複製できます。",
          attachments: [filePath],
        });
      } else {
        Alert.alert("エラー", "メール機能が利用できません");
      }
    } catch (error) {
      console.error("Error backing up:", error);
      Alert.alert("エラー", "バックアップに失敗しました");
    }
  };

  const handleRestoreFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(fileContent);

      Alert.alert(
        "リストア確認",
        "このファイルからデータを複製します。現在のデータは上書きされます。",
        [
          { text: "キャンセル", onPress: () => {} },
          {
            text: "複製していいです",
            onPress: async () => {
              try {
                await importAllDataFromJSON(data);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("成功", "データを複製しました");
                loadParts();
              } catch (error) {
                console.error("Error restoring:", error);
                Alert.alert("エラー", "データの複製に失敗しました");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error selecting file:", error);
      Alert.alert("エラー", "ファイルの選択に失敗しました");
    }
  };

  const filteredParts = parts.filter(
    (p) =>
      p.name.includes(searchText) ||
      p.partNumber.includes(searchText)
  );

  const renderPartItem = ({ item }: { item: Part }) => (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">{item.name}</Text>
          <Text className="text-sm text-muted">品番: {item.partNumber}</Text>
          {item.supplier && (
            <Text className="text-sm text-muted">仕入先: {item.supplier}</Text>
          )}
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => handleEditPart(item)}
            className="bg-primary px-4 py-2 rounded"
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text className="text-white font-semibold">編集</Text>
          </Pressable>
          <Pressable
            onPress={() => handleDeletePart(item)}
            className="bg-error px-4 py-2 rounded"
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text className="text-white font-semibold">削除</Text>
          </Pressable>
        </View>
      </View>
      <View className="flex-row justify-between text-sm">
        <Text className="text-muted">単価: ¥{item.unitPrice}</Text>
        <Text className="text-muted">現在在庫: {item.allowDecimal ? Math.round(item.currentStock * 10) / 10 : Math.round(item.currentStock)}</Text>
        <Text className="text-muted">最低在庫: {item.minStock}</Text>
        <Text className="text-muted">
          小数点: {item.allowDecimal ? "可能" : "不可"}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-2xl font-bold text-foreground">部品マスタ</Text>
            <Pressable
              onPress={handleAddPart}
              className="bg-primary px-4 py-2 rounded-full"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-white font-semibold">+ 追加</Text>
            </Pressable>
          </View>
          {/* バックアップ・リストアボタン */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleBackupEmail}
              className="flex-1 bg-green-500 px-3 py-2 rounded"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-white text-sm font-semibold text-center">バックアップ</Text>
            </Pressable>
            <Pressable
              onPress={handleRestoreFromFile}
              className="flex-1 bg-orange-500 px-3 py-2 rounded"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-white text-sm font-semibold text-center">リストア</Text>
            </Pressable>
          </View>
        </View>

        {/* 検索フィールド */}
        <TextInput
          placeholder="部品名または品番で検索"
          value={searchText}
          onChangeText={setSearchText}
          className="bg-surface border border-border rounded-lg px-4 py-2 mb-4 text-foreground"
          placeholderTextColor="#999"
        />

        {/* 部品リスト */}
        {filteredParts.length > 0 ? (
          <FlatList
            data={filteredParts}
            renderItem={renderPartItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />
        ) : (
          <View className="items-center justify-center py-8">
            <Text className="text-muted">部品がありません</Text>
          </View>
        )}
      </View>

      {/* 編集モーダル */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 100}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-background rounded-t-2xl flex-1">
              <ScrollView
                contentContainerStyle={{
                  paddingBottom: insets.bottom + 100,
                  paddingTop: 20,
                }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={true}
              >
                <View className="p-4">
                  <Text className="text-2xl font-bold text-foreground mb-4">
                    {editingPart.id ? "部品編集" : "部品追加"}
                  </Text>

                  {/* 部品名 */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-foreground mb-2">部品名 *</Text>
                    <TextInput
                      placeholder="部品名を入力"
                      value={editingPart.name || ""}
                      onChangeText={(text) => setEditingPart({ ...editingPart, name: text })}
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* 品番 */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-foreground mb-2">品番 *</Text>
                    <TextInput
                      placeholder="品番を入力"
                      value={editingPart.partNumber || ""}
                      onChangeText={(text) => setEditingPart({ ...editingPart, partNumber: text })}
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* 単価 */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-foreground mb-2">単価</Text>
                    <TextInput
                      placeholder="単価を入力"
                      value={String(editingPart.unitPrice || "")}
                      onChangeText={(text) => setEditingPart({ ...editingPart, unitPrice: parseFloat(text) || 0 })}
                      keyboardType="decimal-pad"
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* 現在在庫数 */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-foreground mb-2">現在在庫数 *</Text>
                    <TextInput
                      placeholder="現在在庫数を入力"
                      value={editingPartText.currentStockText}
                      onChangeText={(text) => setEditingPartText({ ...editingPartText, currentStockText: validateQuantityInput(text, editingPart.allowDecimal || false) })}
                      keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "decimal-pad"}
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* 最低在庫数 */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-foreground mb-2">最低在庫数 *</Text>
                    <TextInput
                      placeholder="最低在庫数を入力"
                      value={editingPartText.minStockText}
                      onChangeText={(text) => setEditingPartText({ ...editingPartText, minStockText: validateQuantityInput(text, editingPart.allowDecimal || false) })}
                      keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "decimal-pad"}
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* 仕入先 */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-foreground mb-2">仕入先</Text>
                    <TextInput
                      placeholder="仕入先を入力（オプション）"
                      value={editingPart.supplier || ""}
                      onChangeText={(text) => setEditingPart({ ...editingPart, supplier: text })}
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* 小数点入力許可 */}
                  <View className="mb-4 flex-row justify-between items-center bg-surface border border-border rounded-lg px-4 py-3">
                    <Text className="text-sm font-semibold text-foreground">小数点入力を許可</Text>
                    <Switch
                      value={editingPart.allowDecimal || false}
                      onValueChange={(value) => setEditingPart({ ...editingPart, allowDecimal: value })}
                    />
                  </View>

                  {/* ボタン */}
                  <View className="flex-row gap-2 mt-6">
                    <Pressable
                      onPress={() => setIsModalVisible(false)}
                      className="flex-1 bg-surface border border-border rounded-lg py-3"
                      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                    >
                      <Text className="text-center text-foreground font-semibold">キャンセル</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSavePart}
                      className="flex-1 bg-primary rounded-lg py-3"
                      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                    >
                      <Text className="text-center text-white font-semibold">保存</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}
