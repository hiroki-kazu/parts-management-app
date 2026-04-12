/**
 * 出庫入力画面
 * 部品使用時の入力フロー
 */

import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import {
  getParts,
  getTodayDate,
  addOutboundRecord,
  getCustomerByVehicleNumber,
  getFrequentParts,
  getPartsByVehicleNumber,
} from "@/lib/storage";
import { Part, Customer } from "@/lib/types";
import * as Haptics from "expo-haptics";

interface OutboundForm {
  date: string;
  voucherNumber: string;
  vehicleNumber: string;
  customerName: string;
  partId: string;
  partName: string;
  quantity: number;
}

export default function OutboundScreen() {
  const router = useRouter();
  const [form, setForm] = useState<OutboundForm>({
    date: getTodayDate(),
    voucherNumber: "",
    vehicleNumber: "",
    customerName: "",
    partId: "",
    partName: "",
    quantity: 1,
  });

  const [parts, setParts] = useState<Part[]>([]);
  const [frequentParts, setFrequentParts] = useState<Part[]>([]);
  const [vehicleHistoryParts, setVehicleHistoryParts] = useState<Part[]>([]);
  const [isPartModalVisible, setIsPartModalVisible] = useState(false);
  const [partSearchText, setPartSearchText] = useState("");

  useEffect(() => {
    loadParts();
  }, []);

  useEffect(() => {
    if (form.vehicleNumber.length === 4) {
      loadVehicleHistory();
      loadCustomerName();
    } else {
      setVehicleHistoryParts([]);
    }
  }, [form.vehicleNumber]);

  const loadParts = async () => {
    try {
      const data = await getParts();
      setParts(data);
      const frequent = await getFrequentParts(5);
      setFrequentParts(frequent);
    } catch (error) {
      console.error("Error loading parts:", error);
    }
  };

  const loadVehicleHistory = async () => {
    try {
      const history = await getPartsByVehicleNumber(form.vehicleNumber, 5);
      setVehicleHistoryParts(history);
    } catch (error) {
      console.error("Error loading vehicle history:", error);
    }
  };

  const loadCustomerName = async () => {
    try {
      const customer = await getCustomerByVehicleNumber(form.vehicleNumber);
      if (customer) {
        setForm((prev) => ({ ...prev, customerName: customer.name }));
      }
    } catch (error) {
      console.error("Error loading customer:", error);
    }
  };

  const handlePartSelect = (part: Part) => {
    setForm((prev) => ({
      ...prev,
      partId: part.id,
      partName: part.name,
    }));
    setIsPartModalVisible(false);
    setPartSearchText("");
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = form.quantity + delta;
    if (newQuantity > 0) {
      setForm((prev) => ({
        ...prev,
        quantity: form.partId && parts.find((p) => p.id === form.partId)?.allowDecimal
          ? Math.max(0.1, newQuantity)
          : Math.max(1, newQuantity),
      }));
    }
  };

  const handleSave = async () => {
    try {
      if (!form.voucherNumber) {
        Alert.alert("エラー", "伝票番号を入力してください");
        return;
      }
      if (!form.vehicleNumber || form.vehicleNumber.length !== 4) {
        Alert.alert("エラー", "ナンバー（下4桁）を入力してください");
        return;
      }
      if (!form.partId) {
        Alert.alert("エラー", "部品を選択してください");
        return;
      }
      if (form.quantity <= 0) {
        Alert.alert("エラー", "数量を入力してください");
        return;
      }

      await addOutboundRecord({
        date: form.date,
        voucherNumber: form.voucherNumber,
        customerName: form.customerName || "未登録",
        vehicleNumber: form.vehicleNumber,
        partId: form.partId,
        partName: form.partName,
        quantity: form.quantity,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("成功", "出庫入力が完了しました");

      // フォームをリセット
      setForm({
        date: getTodayDate(),
        voucherNumber: "",
        vehicleNumber: "",
        customerName: "",
        partId: "",
        partName: "",
        quantity: 1,
      });
    } catch (error) {
      console.error("Error saving outbound record:", error);
      Alert.alert("エラー", "出庫入力に失敗しました");
    }
  };

  const filteredParts = parts.filter(
    (p) =>
      p.name.includes(partSearchText) ||
      p.partNumber.includes(partSearchText)
  );

  const renderPartOption = ({ item }: { item: Part }) => (
    <Pressable
      onPress={() => handlePartSelect(item)}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <View className="bg-surface border-b border-border p-4">
        <Text className="font-semibold text-foreground">{item.name}</Text>
        <Text className="text-xs text-muted">品番: {item.partNumber} | 単価: ¥{item.unitPrice}</Text>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ヘッダー */}
        <View className="flex-row items-center gap-2 mb-4">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text className="text-2xl">←</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">部品を使った</Text>
        </View>

        {/* 日付 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">日付</Text>
          <View className="bg-surface border border-border rounded-lg px-4 py-3">
            <Text className="text-foreground">{form.date}</Text>
          </View>
        </View>

        {/* 伝票番号 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">伝票番号 *</Text>
          <TextInput
            placeholder="伝票番号を入力"
            value={form.voucherNumber}
            onChangeText={(text) => setForm({ ...form, voucherNumber: text })}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
            placeholderTextColor="#999"
          />
        </View>

        {/* ナンバー */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">ナンバー（下4桁） *</Text>
          <TextInput
            placeholder="下4桁を入力"
            value={form.vehicleNumber}
            onChangeText={(text) => setForm({ ...form, vehicleNumber: text.slice(0, 4) })}
            maxLength={4}
            keyboardType="numeric"
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
            placeholderTextColor="#999"
          />
        </View>

        {/* 顧客名 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">顧客名</Text>
          <View className="bg-surface border border-border rounded-lg px-4 py-3">
            <Text className="text-foreground">
              {form.customerName || "（ナンバー入力で自動表示）"}
            </Text>
          </View>
        </View>

        {/* 部品選択 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">部品名 *</Text>
          <Pressable
            onPress={() => setIsPartModalVisible(true)}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <View className="bg-primary rounded-lg px-4 py-3">
              <Text className="text-white font-semibold text-base">
                {form.partName || "部品を選択"}
              </Text>
            </View>
          </Pressable>

          {/* よく使う部品 */}
          {frequentParts.length > 0 && !form.partId && (
            <View className="mt-3">
              <Text className="text-xs text-muted mb-2">よく使う部品</Text>
              <View className="flex-row flex-wrap gap-2">
                {frequentParts.map((part) => (
                  <Pressable
                    key={part.id}
                    onPress={() => handlePartSelect(part)}
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  >
                    <View className="bg-surface border border-primary rounded-full px-3 py-2">
                      <Text className="text-xs text-foreground">{part.name}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* 車両履歴 */}
          {vehicleHistoryParts.length > 0 && !form.partId && (
            <View className="mt-3">
              <Text className="text-xs text-muted mb-2">この車両の使用履歴</Text>
              <View className="flex-row flex-wrap gap-2">
                {vehicleHistoryParts.map((part) => (
                  <Pressable
                    key={part.id}
                    onPress={() => handlePartSelect(part)}
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  >
                    <View className="bg-surface border border-warning rounded-full px-3 py-2">
                      <Text className="text-xs text-foreground">{part.name}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 数量 */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">数量</Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => handleQuantityChange(-0.1)}
              className="bg-surface border border-border rounded-lg w-12 h-12 items-center justify-center"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-lg font-bold text-foreground">−</Text>
            </Pressable>
            <TextInput
              value={String(form.quantity)}
              onChangeText={(text) => setForm({ ...form, quantity: parseFloat(text) || 0 })}
              keyboardType="decimal-pad"
              className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-center text-foreground text-base"
              placeholderTextColor="#999"
            />
            <Pressable
              onPress={() => handleQuantityChange(0.1)}
              className="bg-surface border border-border rounded-lg w-12 h-12 items-center justify-center"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-lg font-bold text-foreground">+</Text>
            </Pressable>
          </View>
        </View>

        {/* 保存ボタン */}
        <Pressable
          onPress={handleSave}
          className="bg-primary rounded-lg py-4 mb-4"
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}
        >
          <Text className="text-center text-white font-bold text-lg">保存</Text>
        </Pressable>
      </ScrollView>

      {/* 部品選択モーダル */}
      <Modal
        visible={isPartModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPartModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-2xl max-h-[80%]">
            <View className="p-4 border-b border-border">
              <Text className="text-lg font-bold text-foreground mb-3">部品を選択</Text>
              <TextInput
                placeholder="部品名または品番で検索"
                value={partSearchText}
                onChangeText={setPartSearchText}
                className="bg-surface border border-border rounded-lg px-4 py-2 text-foreground"
                placeholderTextColor="#999"
              />
            </View>
            <FlatList
              data={filteredParts}
              renderItem={renderPartOption}
              keyExtractor={(item) => item.id}
              scrollEnabled={true}
            />
            <Pressable
              onPress={() => setIsPartModalVisible(false)}
              className="bg-surface border-t border-border p-4"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-center text-foreground font-semibold">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
