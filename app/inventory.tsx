/**
 * 在庫一覧画面
 * 全部品の現在在庫状態を表示
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Modal,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { getParts, updatePart, addPart, deletePart, importPartsFromCSV, getSuppliers } from "@/lib/storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Part, InventoryStatus } from "@/lib/types";

interface InventoryItem {
  part: Part;
  status: InventoryStatus;
  isLow: boolean;
  isNegative: boolean;
}

type ModalType = "edit-stock" | "edit-min-stock" | "add-part" | "bulk-edit" | null;

export default function InventoryScreen() {
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  
  // 一括編集用
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState("");
  const [bulkMinStockValue, setBulkMinStockValue] = useState("");

  // 新規部品追加用
  const [newPartName, setNewPartName] = useState("");
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newUnitPrice, setNewUnitPrice] = useState("");
  const [newMinStock, setNewMinStock] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newAllowDecimal, setNewAllowDecimal] = useState(false);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [isSupplierDropdownVisible, setIsSupplierDropdownVisible] = useState(false);

  // インポート機能
  const handleImportParts = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);

      Alert.alert(
        "インポート確認",
        "このCSVファイルから部品をインポートします。",
        [
          { text: "キャンセル", onPress: () => {} },
          {
            text: "インポート",
            onPress: async () => {
              try {
                await importPartsFromCSV(fileContent);
                Alert.alert("成功", "部品をインポートしました");
                loadInventory();
              } catch (error) {
                console.error("Error importing parts:", error);
                Alert.alert("エラー", "部品のインポートに失敗しました");
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

  useFocusEffect(
    useCallback(() => {
      loadInventory();
      loadSuppliers();
    }, [])
  );

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  // ドロップダウンアイテムのダブルタップ検出
  const lastSupplierSelectTapRef = useRef<{ [key: string]: number }>({});
  const handleSupplierItemPress = (supplier: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const lastTap = lastSupplierSelectTapRef.current[supplier] || 0;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      console.log("[Supplier double tap detected]", supplier);
      // ダブルタップ時に選択
      setNewSupplier(supplier);
      setIsSupplierDropdownVisible(false);
    } else {
      console.log("[Supplier single tap detected]", supplier);
      // 単一タップ時はハイライト表示（視覚的フィードバック）
    }
    lastSupplierSelectTapRef.current[supplier] = now;
  };

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

  const handleEditStock = (partId: string, currentStock: number) => {
    setEditingPartId(partId);
    setEditingValue(currentStock.toString());
    setModalType("edit-stock");
  };

  const handleEditMinStock = (partId: string, minStock: number) => {
    setEditingPartId(partId);
    setEditingValue(minStock.toString());
    setModalType("edit-min-stock");
  };

  const handleSaveValue = async () => {
    if (!editingPartId || !editingValue) return;
    
    try {
      const newValue = parseFloat(editingValue);
      
      if (modalType === "edit-stock") {
        await updatePart(editingPartId || "", { currentStock: newValue });
        Alert.alert("成功", "在庫数を更新しました");
      } else if (modalType === "edit-min-stock") {
        await updatePart(editingPartId || "", { minStock: newValue });
        Alert.alert("成功", "最低在庫を更新しました");
      }
      
      setEditingPartId(null);
      setEditingValue("");
      setModalType(null);
      await loadInventory();
    } catch (error) {
      Alert.alert("エラー", "更新に失敗しました");
    }
  };

  const handleDeletePart = (partId: string, partName: string) => {
    Alert.alert(
      "削除確認",
      `「${partName}」を削除してもよろしいですか？`,
      [
        { text: "キャンセル", onPress: () => {} },
        {
          text: "削除",
          onPress: async () => {
            try {
              await deletePart(partId);
              Alert.alert("成功", "部品を削除しました");
              await loadInventory();
            } catch (error) {
              Alert.alert("エラー", "部品の削除に失敗しました");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleAddPart = async () => {
    if (!newPartName || !newPartNumber || !newUnitPrice || !newMinStock) {
      Alert.alert("エラー", "すべての項目を入力してください");
      return;
    }

    try {
      await addPart({
        name: newPartName,
        partNumber: newPartNumber,
        unitPrice: parseFloat(newUnitPrice),
        currentStock: 0,
        minStock: parseFloat(newMinStock),
        allowDecimal: newAllowDecimal,
        supplier: newSupplier || undefined,
      });

      Alert.alert("成功", "部品を追加しました");
      setNewPartName("");
      setNewPartNumber("");
      setNewUnitPrice("");
      setNewMinStock("");
      setNewSupplier("");
      setNewAllowDecimal(false);
      setModalType(null);
      await loadInventory();
    } catch (error) {
      Alert.alert("エラー", "部品の追加に失敗しました");
    }
  };

  const filteredItems = inventoryItems.filter(
    (item) =>
      item.part.name.includes(searchText) ||
      item.part.partNumber.includes(searchText)
  );

  const handleToggleSelect = (partId: string) => {
    const newSelected = new Set(selectedPartIds);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedPartIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPartIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedPartIds(new Set());
    } else {
      setSelectedPartIds(new Set(filteredItems.map(item => item.part.id)));
    }
  };

  const handleBulkEdit = async () => {
    if (selectedPartIds.size === 0) {
      Alert.alert("エラー", "部品を選択してください");
      return;
    }

    if (!bulkStockValue && !bulkMinStockValue) {
      Alert.alert("エラー", "更新内容を入力してください");
      return;
    }

    try {
      const selectedParts = inventoryItems.filter(item => selectedPartIds.has(item.part.id));
      
      for (const item of selectedParts) {
        const updatedPart = {
          ...item.part,
          currentStock: bulkStockValue ? parseFloat(bulkStockValue) : item.part.currentStock,
          minStock: bulkMinStockValue ? parseFloat(bulkMinStockValue) : item.part.minStock,
        };
        await updatePart(item.part.id, updatedPart);
      }

      Alert.alert("成功", `${selectedPartIds.size}件の部品を更新しました`);
      setSelectedPartIds(new Set());
      setBulkEditMode(false);
      setBulkStockValue("");
      setBulkMinStockValue("");
      setModalType(null);
      await loadInventory();
    } catch (error) {
      Alert.alert("エラー", "一括更新に失敗しました");
    }
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View
      className={`rounded-lg p-4 mb-3 border-2 ${
        item.isNegative ? 'bg-error/20 border-error' : 
        item.isLow ? 'bg-warning/10 border-warning' : 
        'bg-surface border-border'
      }`}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className={`text-lg font-semibold ${
            item.isNegative ? 'text-error' : 
            item.isLow ? 'text-warning' : 
            'text-foreground'
          }`}>
            {item.isNegative ? '🚨 ' : item.isLow ? '⚠️ ' : ''}{item.part.name}
          </Text>
          <Text className="text-sm text-muted">品番: {item.part.partNumber}</Text>
          {item.part.supplier && (
            <Text className="text-sm text-muted mt-1">仕入先: {item.part.supplier}</Text>
          )}
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
            {item.part.allowDecimal ? 
              Math.round(item.part.currentStock * 10) / 10 : 
              Math.round(item.part.currentStock)
            }個
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
        <View className="mt-3 bg-error rounded-lg p-3 border-2 border-error">
          <Text className="text-sm text-white font-bold">
            🚨 緊急: マイナス在庫です
          </Text>
          <Text className="text-xs text-white/90 mt-1">
            在庫数が負の値になっています。即座に確認・修正が必要です。
          </Text>
        </View>
      )}

      {item.isLow && !item.isNegative && (
        <View className="mt-3 bg-warning rounded-lg p-3 border-2 border-warning">
          <Text className="text-sm text-white font-bold">
            ⚠️ 警告: 最低在庫以下
          </Text>
          <Text className="text-xs text-white/90 mt-1">
            発注が必要です。最低在庫数: {item.part.minStock}個
          </Text>
        </View>
      )}

      {/* アクションボタン */}
      <View className="flex-row gap-2 mt-3">
        <Pressable 
          onPress={() => handleEditStock(item.part.id, item.part.currentStock)}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          className="flex-1 bg-primary rounded-lg py-2"
        >
          <Text className="text-white text-center font-semibold text-sm">在庫修正</Text>
        </Pressable>
        
        <Pressable 
          onPress={() => handleEditMinStock(item.part.id, item.part.minStock)}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          className="flex-1 bg-warning rounded-lg py-2"
        >
          <Text className="text-white text-center font-semibold text-sm">最低在庫修正</Text>
        </Pressable>
        
        <Pressable 
          onPress={() => handleDeletePart(item.part.id, item.part.name)}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          className="flex-1 bg-error rounded-lg py-2"
        >
          <Text className="text-white text-center font-semibold text-sm">削除</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
    <ScreenContainer className="p-4">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text className="text-2xl">←</Text>
            </Pressable>
            <Text className="text-2xl font-bold text-foreground">在庫一覧</Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable 
              onPress={() => setModalType("add-part")}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="bg-success rounded-full w-10 h-10 items-center justify-center"
            >
              <Text className="text-white text-xl font-bold">+</Text>
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

    {/* 在庫修正モーダル */}
    <Modal
      visible={modalType === "edit-stock"}
      transparent
      animationType="fade"
      onRequestClose={() => setModalType(null)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-background rounded-lg p-6 w-full max-w-sm">
          <Text className="text-lg font-bold text-foreground mb-4">在庫数を修正</Text>
          
          <TextInput
            placeholder="新しい在庫数を入力"
            value={editingValue}
            onChangeText={setEditingValue}
            keyboardType="decimal-pad"
            className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
            placeholderTextColor="#999"
          />
          
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setModalType(null)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-1 bg-muted rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-foreground">キャンセル</Text>
            </Pressable>
            
            <Pressable
              onPress={handleSaveValue}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-1 bg-primary rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-white">保存</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    {/* 最低在庫修正モーダル */}
    <Modal
      visible={modalType === "edit-min-stock"}
      transparent
      animationType="fade"
      onRequestClose={() => setModalType(null)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-background rounded-lg p-6 w-full max-w-sm">
          <Text className="text-lg font-bold text-foreground mb-4">最低在庫を修正</Text>
          
          <TextInput
            placeholder="新しい最低在庫を入力"
            value={editingValue}
            onChangeText={setEditingValue}
            keyboardType="decimal-pad"
            className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
            placeholderTextColor="#999"
          />
          
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setModalType(null)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-1 bg-muted rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-foreground">キャンセル</Text>
            </Pressable>
            
            <Pressable
              onPress={handleSaveValue}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-1 bg-primary rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-white">保存</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    {/* 部品追加モーダル */}
    <Modal
      visible={modalType === "add-part"}
      transparent
      animationType="fade"
      onRequestClose={() => setModalType(null)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-background rounded-lg p-6 w-full max-w-sm max-h-96">
          <Text className="text-lg font-bold text-foreground mb-4">新規部品を追加</Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput
              placeholder="部品名"
              value={newPartName}
              onChangeText={setNewPartName}
              className="bg-surface border border-border rounded-lg px-4 py-3 mb-3 text-foreground"
              placeholderTextColor="#999"
            />
            
            <TextInput
              placeholder="品番"
              value={newPartNumber}
              onChangeText={setNewPartNumber}
              className="bg-surface border border-border rounded-lg px-4 py-3 mb-3 text-foreground"
              placeholderTextColor="#999"
            />
            
            <TextInput
              placeholder="単価（円）"
              value={newUnitPrice}
              onChangeText={setNewUnitPrice}
              keyboardType="decimal-pad"
              className="bg-surface border border-border rounded-lg px-4 py-3 mb-3 text-foreground"
              placeholderTextColor="#999"
            />
            
            <TextInput
              placeholder="最低在庫"
              value={newMinStock}
              onChangeText={setNewMinStock}
              keyboardType="decimal-pad"
              className="bg-surface border border-border rounded-lg px-4 py-3 mb-3 text-foreground"
              placeholderTextColor="#999"
            />
            
            <View className="relative mb-3">
              <TextInput
                placeholder="仕入れ先（オプション）"
                value={newSupplier}
                onChangeText={(text) => {
                  setNewSupplier(text);
                  // テキスト入力時は常にドロップダウンを表示（訂正時も対応）
                  setIsSupplierDropdownVisible(true);
                }}
                onFocus={() => setIsSupplierDropdownVisible(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setIsSupplierDropdownVisible(false);
                  }, 200);
                }}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#999"
              />
              {/* ドロップダウンリスト */}
              {isSupplierDropdownVisible && suppliers.filter((s) => s.toLowerCase().includes(newSupplier.toLowerCase())).length > 0 && (
                <View className="bg-surface border border-border rounded-lg mt-1 max-h-40 z-50">
                  <ScrollView scrollEnabled={true}>
                    {suppliers.filter((s) => s.toLowerCase().includes(newSupplier.toLowerCase())).map((item, index) => (
                      <TouchableOpacity
                        key={`${item}-${index}`}
                        onPress={() => handleSupplierItemPress(item)}
                        activeOpacity={0.7}
                      >
                        <View className="border-b border-border p-3">
                          <Text className="text-foreground">{item}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            
            {/* 小数使用フラグ */}
            <Pressable
              onPress={() => setNewAllowDecimal(!newAllowDecimal)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-row items-center gap-3 mb-4 p-3 bg-surface rounded-lg border border-border"
            >
              <View className={`w-6 h-6 rounded border-2 ${newAllowDecimal ? "bg-primary border-primary" : "border-border"}`}>
                {newAllowDecimal && <Text className="text-white text-center">✓</Text>}
              </View>
              <Text className="text-foreground">小数単位での在庫管理を許可</Text>
            </Pressable>
          </ScrollView>
          
          <View className="flex-row gap-3 mt-4">
            <Pressable
              onPress={() => setModalType(null)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-1 bg-muted rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-foreground">キャンセル</Text>
            </Pressable>
            
            <Pressable
              onPress={handleAddPart}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-1 bg-success rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-white">追加</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    {/* 一括編集モーダル */}
    <Modal
      visible={modalType === "bulk-edit"}
      transparent
      animationType="fade"
      onRequestClose={() => setModalType(null)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-background rounded-lg p-6 w-full max-w-sm">
          <Text className="text-lg font-bold text-foreground mb-4">一括編集 ({selectedPartIds.size}件)</Text>
          
          <TextInput
            placeholder="在庫数を入力（空白で変更なし）"
            value={bulkStockValue}
            onChangeText={setBulkStockValue}
            keyboardType="decimal-pad"
            className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
            placeholderTextColor="#999"
          />
          
          <TextInput
            placeholder="最低在庫を入力（空白で変更なし）"
            value={bulkMinStockValue}
            onChangeText={setBulkMinStockValue}
            keyboardType="decimal-pad"
            className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
            placeholderTextColor="#999"
          />
          
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setModalType(null)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-1 bg-muted rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-foreground">キャンセル</Text>
            </Pressable>
            
            <Pressable
              onPress={handleBulkEdit}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-1 bg-warning rounded-lg py-3"
            >
              <Text className="text-center font-semibold text-white">更新</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}
