/**
 * 在庫一覧画面
 * 全部品の現在在庫状態を表示
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
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { getParts } from "@/lib/storage";
import { Part, InventoryStatus } from "@/lib/types";

interface InventoryItem {
  part: Part;
  status: InventoryStatus;
  isLow: boolean;
  isNegative: boolean;
}

export default function InventoryScreen() {
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchText, setSearchText] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [])
  );

  const loadInventory = async () => {
    try {
      const parts = await getParts();
      const items: InventoryItem[] = parts.map((part) => {
        let status: InventoryStatus;
        const isNegative = part.currentStock < 0;
        const isLow = part.currentStock <= part.minStock && part.currentStock >= 0;

        if (isNegative) {
          status = InventoryStatus.NEGATIVE;
        } else if (isLow) {
          status = InventoryStatus.LOW;
        } else {
          status = InventoryStatus.NORMAL;
        }

        return {
          part,
          status,
          isLow,
          isNegative,
        };
      });

      setInventoryItems(items);
    } catch (error) {
      console.error("Error loading inventory:", error);
    }
  };

  const getStatusColor = (status: InventoryStatus): string => {
    switch (status) {
      case InventoryStatus.NORMAL:
        return "bg-success";
      case InventoryStatus.LOW:
        return "bg-warning";
      case InventoryStatus.NEGATIVE:
        return "bg-error";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: InventoryStatus): string => {
    switch (status) {
      case InventoryStatus.NORMAL:
        return "適正";
      case InventoryStatus.LOW:
        return "発注推奨";
      case InventoryStatus.NEGATIVE:
        return "警告";
      default:
        return "不明";
    }
  };

  const filteredItems = inventoryItems.filter(
    (item) =>
      item.part.name.includes(searchText) ||
      item.part.partNumber.includes(searchText)
  );

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">{item.part.name}</Text>
          <Text className="text-sm text-muted">品番: {item.part.partNumber}</Text>
        </View>
        <View className={`${getStatusColor(item.status)} rounded-full px-3 py-1`}>
          <Text className="text-white text-xs font-semibold">
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View className="border-t border-border pt-3 mt-3">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-muted">単価</Text>
          <Text className="text-sm font-semibold text-foreground">
            ¥{item.part.unitPrice.toLocaleString()}
          </Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-muted">現在在庫</Text>
          <Text className={`text-sm font-bold ${
            item.isNegative ? "text-error" : item.isLow ? "text-warning" : "text-success"
          }`}>
            {item.part.currentStock}個
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-muted">最低在庫</Text>
          <Text className="text-sm font-semibold text-foreground">
            {item.part.minStock}個
          </Text>
        </View>
      </View>

      {item.isNegative && (
        <View className="mt-3 bg-error/10 rounded p-2">
          <Text className="text-xs text-error font-semibold">
            ⚠ マイナス在庫です。確認が必要です。
          </Text>
        </View>
      )}

      {item.isLow && !item.isNegative && (
        <View className="mt-3 bg-warning/10 rounded p-2">
          <Text className="text-xs text-warning font-semibold">
            📢 発注推奨: 最低在庫以下です
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="flex-row items-center gap-2 mb-4">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text className="text-2xl">←</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">在庫一覧</Text>
        </View>

        {/* 検索フィールド */}
        <TextInput
          placeholder="部品名または品番で検索"
          value={searchText}
          onChangeText={setSearchText}
          className="bg-surface border border-border rounded-lg px-4 py-2 mb-4 text-foreground"
          placeholderTextColor="#999"
        />

        {/* 統計情報 */}
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 bg-success/10 rounded-lg p-3 border border-success">
            <Text className="text-xs text-muted">適正</Text>
            <Text className="text-lg font-bold text-success">
              {inventoryItems.filter((i) => i.status === InventoryStatus.NORMAL).length}
            </Text>
          </View>
          <View className="flex-1 bg-warning/10 rounded-lg p-3 border border-warning">
            <Text className="text-xs text-muted">発注推奨</Text>
            <Text className="text-lg font-bold text-warning">
              {inventoryItems.filter((i) => i.status === InventoryStatus.LOW).length}
            </Text>
          </View>
          <View className="flex-1 bg-error/10 rounded-lg p-3 border border-error">
            <Text className="text-xs text-muted">警告</Text>
            <Text className="text-lg font-bold text-error">
              {inventoryItems.filter((i) => i.status === InventoryStatus.NEGATIVE).length}
            </Text>
          </View>
        </View>

        {/* 在庫リスト */}
        {filteredItems.length > 0 ? (
          <FlatList
            data={filteredItems}
            renderItem={renderInventoryItem}
            keyExtractor={(item) => item.part.id}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />
        ) : (
          <View className="items-center justify-center py-8">
            <Text className="text-muted">該当する部品がありません</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
