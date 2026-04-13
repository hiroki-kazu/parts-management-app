/**
 * 部品マスタ管理画面
 * 部品の追加・編集・削除機能
 */

import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
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
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { getParts, addPart, updatePart, deletePart } from "@/lib/storage";
import { Part } from "@/lib/types";
import * as Haptics from "expo-haptics";

interface EditingPart extends Partial<Part> {
  id?: string;
  name: string;
  partNumber: string;
  unitPrice: number;
  currentStock: number;
  minStock: number;
  allowDecimal: boolean;
  isFavorite?: boolean;
  displayOrder?: number;
}

export default function PartsScreen() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPart, setEditingPart] = useState<EditingPart>({
    name: "",
    partNumber: "",
    unitPrice: 0,
    currentStock: 0,
    minStock: 0,
    allowDecimal: false,
    isFavorite: false,
    displayOrder: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadParts();
    }, [])
  );

  const loadParts = async () => {
    try {
      const loadedParts = await getParts();
      setParts(loadedParts);
    } catch (error) {
      console.error("Error loading parts:", error);
    }
  };

  const handleSave = async () => {
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
          currentStock: editingPart.currentStock || 0,
          minStock: editingPart.minStock || 0,
          allowDecimal: editingPart.allowDecimal || false,
          isFavorite: editingPart.isFavorite || false,
          displayOrder: editingPart.displayOrder || 0,
        });
      } else {
        // 追加
        const maxOrder = parts.length > 0 ? Math.max(...parts.map(p => p.displayOrder || 0)) : 0;
        await addPart({
          name: editingPart.name,
          partNumber: editingPart.partNumber,
          unitPrice: editingPart.unitPrice || 0,
          currentStock: editingPart.currentStock || 0,
          minStock: editingPart.minStock || 0,
          allowDecimal: editingPart.allowDecimal || false,
          isFavorite: false,
          displayOrder: maxOrder + 1,
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

  const handleDelete = async (id: string) => {
    Alert.alert("削除確認", "この部品を削除しますか？", [
      { text: "キャンセル", onPress: () => {} },
      {
        text: "削除",
        onPress: async () => {
          try {
            await deletePart(id);
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

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setIsModalVisible(true);
  };

  const handleAdd = () => {
    const maxOrder = parts.length > 0 ? Math.max(...parts.map(p => p.displayOrder || 0)) : 0;
    setEditingPart({
      name: "",
      partNumber: "",
      unitPrice: 0,
      currentStock: 0,
      minStock: 0,
      allowDecimal: false,
      isFavorite: false,
      displayOrder: maxOrder + 1,
    });
    setIsModalVisible(true);
  };

  const filteredParts = parts.filter(
    (part) =>
      part.name.includes(searchText) || part.partNumber.includes(searchText)
  );

  const renderPartItem = ({ item }: { item: Part }) => (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border flex-row justify-between items-center">
      <View className="flex-1">
        <Text className="text-lg font-semibold text-foreground">{item.name}</Text>
        <Text className="text-sm text-muted">品番: {item.partNumber}</Text>
        <Text className="text-sm text-muted">在庫: {item.currentStock}個</Text>
        {item.isFavorite && (
          <Text className="text-xs text-warning mt-1">★ よく使う部品</Text>
        )}
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => handleEdit(item)}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text className="text-2xl">✏️</Text>
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item.id)}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text className="text-2xl">🗑️</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text className="text-2xl">←</Text>
            </Pressable>
            <Text className="text-2xl font-bold text-foreground">部品マスタ</Text>
          </View>
          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text className="text-2xl">➕</Text>
          </Pressable>
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
          />
        ) : (
          <View className="items-center justify-center py-8">
            <Text className="text-muted">部品がありません</Text>
          </View>
        )}
      </View>

      {/* 編集モーダル */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <ScreenContainer className="p-4">
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-2xl font-bold text-foreground">
                {editingPart.id ? "部品編集" : "部品追加"}
              </Text>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text className="text-2xl">✕</Text>
              </Pressable>
            </View>

            <ScrollView>
              {/* 部品名 */}
              <Text className="text-sm font-semibold text-foreground mb-2">部品名 *</Text>
              <TextInput
                placeholder="部品名"
                value={editingPart.name}
                onChangeText={(text) =>
                  setEditingPart((prev) => ({ ...prev, name: text }))
                }
                className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
                placeholderTextColor="#999"
              />

              {/* 品番 */}
              <Text className="text-sm font-semibold text-foreground mb-2">品番 *</Text>
              <TextInput
                placeholder="品番"
                value={editingPart.partNumber}
                onChangeText={(text) =>
                  setEditingPart((prev) => ({ ...prev, partNumber: text }))
                }
                className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
                placeholderTextColor="#999"
              />

              {/* 単価 */}
              <Text className="text-sm font-semibold text-foreground mb-2">単価（円）</Text>
              <TextInput
                placeholder="0"
                value={String(editingPart.unitPrice || 0)}
                onChangeText={(text) =>
                  setEditingPart((prev) => ({
                    ...prev,
                    unitPrice: parseInt(text) || 0,
                  }))
                }
                keyboardType="number-pad"
                className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
                placeholderTextColor="#999"
              />

              {/* 現在在庫 */}
              <Text className="text-sm font-semibold text-foreground mb-2">現在在庫</Text>
              <TextInput
                placeholder="0"
                value={String(editingPart.currentStock || 0)}
                onChangeText={(text) =>
                  setEditingPart((prev) => ({
                    ...prev,
                    currentStock: parseInt(text) || 0,
                  }))
                }
                keyboardType="number-pad"
                className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
                placeholderTextColor="#999"
              />

              {/* 最低在庫 */}
              <Text className="text-sm font-semibold text-foreground mb-2">最低在庫</Text>
              <TextInput
                placeholder="0"
                value={String(editingPart.minStock || 0)}
                onChangeText={(text) =>
                  setEditingPart((prev) => ({
                    ...prev,
                    minStock: parseInt(text) || 0,
                  }))
                }
                keyboardType="number-pad"
                className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
                placeholderTextColor="#999"
              />

              {/* 小数対応フラグ */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm font-semibold text-foreground">小数対応</Text>
                <Switch
                  value={editingPart.allowDecimal || false}
                  onValueChange={(value) =>
                    setEditingPart((prev) => ({ ...prev, allowDecimal: value }))
                  }
                />
              </View>

              {/* よく使う部品フラグ */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm font-semibold text-foreground">よく使う部品</Text>
                <Switch
                  value={editingPart.isFavorite || false}
                  onValueChange={(value) =>
                    setEditingPart((prev) => ({ ...prev, isFavorite: value }))
                  }
                />
              </View>

              {/* 表示順序 */}
              <Text className="text-sm font-semibold text-foreground mb-2">表示順序</Text>
              <TextInput
                placeholder="0"
                value={String(editingPart.displayOrder || 0)}
                onChangeText={(text) =>
                  setEditingPart((prev) => ({
                    ...prev,
                    displayOrder: parseInt(text) || 0,
                  }))
                }
                keyboardType="number-pad"
                className="bg-surface border border-border rounded-lg px-4 py-3 mb-6 text-foreground"
                placeholderTextColor="#999"
              />

              {/* 保存ボタン */}
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => ([
                  { backgroundColor: pressed ? '#0a7ea4dd' : '#0a7ea4', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
                ])}
              >
                <Text className="text-white font-bold text-lg">保存</Text>
              </Pressable>
            </ScrollView>
          </View>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
