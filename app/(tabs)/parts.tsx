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
  const insets = useSafeAreaInsets();
  const [parts, setParts] = useState<Part[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPart, setEditingPart] = useState<EditingPart>({});
  const [editingPartText, setEditingPartText] = useState<EditingPartText>({
    currentStockText: "",
    minStockText: "",
  });
  const [searchText, setSearchText] = useState("");

  // 初期ロード
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

  const handleSavePart = async () => {
    try {
      if (!editingPart.name || !editingPart.partNumber) {
        Alert.alert("エラー", "部品名と品番は必須です");
        return;
      }

      if (editingPart.id) {
        // 更新
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
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => handleEditPart(item)}
            className="bg-primary px-3 py-2 rounded"
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text className="text-white text-sm font-semibold">編集</Text>
          </Pressable>
          <Pressable
            onPress={() => handleDeletePart(item)}
            className="bg-error px-3 py-2 rounded"
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text className="text-white text-sm font-semibold">削除</Text>
          </Pressable>
        </View>
      </View>

      <View className="grid grid-cols-2 gap-2 mt-2">
        <View>
          <Text className="text-xs text-muted">単価</Text>
          <Text className="text-sm font-semibold text-foreground">¥{item.unitPrice.toLocaleString()}</Text>
        </View>
        <View>
          <Text className="text-xs text-muted">現在在庫</Text>
          <Text className="text-sm font-semibold text-foreground">{item.currentStock}個</Text>
        </View>
        <View>
          <Text className="text-xs text-muted">最低在庫</Text>
          <Text className="text-sm font-semibold text-foreground">{item.minStock}個</Text>
        </View>
        <View>
          <Text className="text-xs text-muted">小数使用</Text>
          <Text className="text-sm font-semibold text-foreground">
            {item.allowDecimal ? "可能" : "不可"}
          </Text>
        </View>
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
          {/* バッチ追加・バックアップボタン */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => Alert.alert("バッチ追加", "CSV ファイルのインポート機能は開発中です")}
              className="flex-1 bg-blue-500 px-3 py-2 rounded"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-white text-sm font-semibold text-center">CSV インポート</Text>
            </Pressable>
            <Pressable
              onPress={() => Alert.alert("バックアップ", "バックアップ機能は開発中です")}
              className="flex-1 bg-green-500 px-3 py-2 rounded"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-white text-sm font-semibold text-center">バックアップ</Text>
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
            scrollEnabled={false}
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-background rounded-t-2xl p-6 max-h-[90%]">
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
              >
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
                <Text className="text-sm font-semibold text-foreground mb-2">単価（円）</Text>
                <TextInput
                  placeholder="0"
                  value={String(editingPart.unitPrice || "")}
                  onChangeText={(text) =>
                    setEditingPart({ ...editingPart, unitPrice: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholderTextColor="#999"
                />
              </View>

              {/* 現在在庫 */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-foreground mb-2">現在在庫数</Text>
                <TextInput
                  placeholder="0"
                  value={editingPartText.currentStockText}
                  onChangeText={(text) => {
                    // 数字と小数点のみを許可
                    const filtered = text.replace(/[^0-9.]/g, '');
                    // 小数点の重複を防止
                    const parts = filtered.split('.');
                    let result = parts[0];
                    if (parts.length > 1) {
                      result += '.' + parts.slice(1).join('').substring(0, 1);
                    }
                    setEditingPartText({ ...editingPartText, currentStockText: result });
                  }}
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "decimal-pad"}
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholderTextColor="#999"
                />
              </View>

              {/* 最低在庫 */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-foreground mb-2">最低在庫数</Text>
                <TextInput
                  placeholder="0"
                  value={editingPartText.minStockText}
                  onChangeText={(text) => {
                    // 数字と小数点のみを許可
                    const filtered = text.replace(/[^0-9.]/g, '');
                    // 小数点の重複を防止
                    const parts = filtered.split('.');
                    let result = parts[0];
                    if (parts.length > 1) {
                      result += '.' + parts.slice(1).join('').substring(0, 1);
                    }
                    setEditingPartText({ ...editingPartText, minStockText: result });
                  }}
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "decimal-pad"}
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholderTextColor="#999"
                />
              </View>

              {/* 小数使用フラグ */}
              <View className="flex-row justify-between items-center mb-6 bg-surface rounded-lg p-4">
                <Text className="text-sm font-semibold text-foreground">小数使用可能</Text>
                <Switch
                  value={editingPart.allowDecimal || false}
                  onValueChange={(value) =>
                    setEditingPart({ ...editingPart, allowDecimal: value })
                  }
                />
              </View>

              {/* ボタン */}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  className="flex-1 bg-border rounded-lg py-3"
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text className="text-center font-semibold text-foreground">キャンセル</Text>
                </Pressable>
                <Pressable
                  onPress={handleSavePart}
                  className="flex-1 bg-primary rounded-lg py-3"
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text className="text-center font-semibold text-white">保存</Text>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}
