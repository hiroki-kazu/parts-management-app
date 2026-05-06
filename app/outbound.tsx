/**
 * 出庫入力画面
 * 部品使用時の入力フロー
 */

import React, { useEffect, useState, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getParts,
  getTodayDate,
  addOutboundRecord,
  getCustomerByVehicleNumber,
  getFrequentParts,
  getPartsByVehicleNumber,
  getOutboundRecordByVoucherNumber,
} from "@/lib/storage";
import { Part, Customer } from "@/lib/types";
import * as Haptics from "expo-haptics";

/**
 * 数量入力値の検証と正規化
 */
const validateQuantityInput = (text: string, allowDecimal: boolean): string => {
  if (!text) return "";

  // 数字と小数点のみを許可
  let sanitized = text.replace(/[^0-9.]/g, "");

  // 小数点の重複を防止
  const dotCount = (sanitized.match(/\./g) || []).length;
  if (dotCount > 1) {
    // 最初の小数点のみを保持
    const parts = sanitized.split(".");
    sanitized = parts[0] + "." + parts.slice(1).join("");
  }

  // 小数非対応の場合は整数のみ
  if (!allowDecimal) {
    sanitized = sanitized.replace(/\./g, "");
  }

  // 小数精度を制限（小数第1位まで）
  if (allowDecimal && sanitized.includes(".")) {
    const [integer, decimal] = sanitized.split(".");
    sanitized = integer + "." + decimal.substring(0, 1);
  }

  return sanitized;
};

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
  const [quantityInputText, setQuantityInputText] = useState("1");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const quantityInputRef = useRef<TextInput>(null);
  const voucherInputRef = useRef<TextInput>(null);
  const vehicleInputRef = useRef<TextInput>(null);
  const customerInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadParts();
  }, []);

  useEffect(() => {
    if (form.voucherNumber.length > 0) {
      loadRecordByVoucherNumber();
    }
  }, [form.voucherNumber]);

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

  const loadRecordByVoucherNumber = async () => {
    try {
      const record = await getOutboundRecordByVoucherNumber(form.voucherNumber);
      if (record) {
        // 伝票番号が同じ場合、ナンバーと顧客名を自動入力
        setForm((prev) => ({
          ...prev,
          vehicleNumber: record.vehicleNumber,
          customerName: record.customerName,
        }));
      }
    } catch (error) {
      console.error("Error loading record by voucher number:", error);
    }
  };

  const handlePartSelect = (part: Part) => {
    setForm((prev) => ({
      ...prev,
      partId: part.id,
      partName: part.name,
      quantity: part.allowDecimal ? 0.1 : 1,
    }));
    setQuantityInputText(part.allowDecimal ? "0.1" : "1");
    setIsPartModalVisible(false);
    setPartSearchText("");
    
    // 部品選択後に数量入力フィールドにフォーカスを移動
    setTimeout(() => {
      quantityInputRef.current?.focus();
      // スクロールして数量入力フィールドを表示
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleQuantityChange = (delta: number) => {
    const selectedPart = parts.find((p) => p.id === form.partId);
    if (!selectedPart) return;

    const step = selectedPart.allowDecimal ? 0.1 : 1;
    const newQuantity = form.quantity + delta;

    if (newQuantity > 0) {
      const rounded = Math.round(newQuantity * 10) / 10;
      setForm((prev) => ({
        ...prev,
        quantity: rounded,
      }));
      setQuantityInputText(String(rounded));
    }
  };

  const handleQuantityTextChange = (text: string) => {
    const selectedPart = parts.find((p) => p.id === form.partId);
    const allowDecimal = selectedPart?.allowDecimal ?? false;

    // 入力値を検証・正規化
    const validated = validateQuantityInput(text, allowDecimal);
    setQuantityInputText(validated);

    // 数値に変換
    const num = parseFloat(validated) || 0;
    setForm((prev) => ({
      ...prev,
      quantity: num,
    }));
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
      if (!form.customerName) {
        Alert.alert("エラー", "顧客名を入力してください");
        return;
      }
      if (!form.partId) {
        Alert.alert("エラー", "部品を選択してください");
        return;
      }
      if (form.quantity <= 0) {
        Alert.alert("エラー", "数量は0より大きい値を入力してください");
        return;
      }

      await addOutboundRecord({
        date: form.date,
        voucherNumber: form.voucherNumber,
        customerName: form.customerName,
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
      setQuantityInputText("1");
    } catch (error) {
      console.error("Error saving outbound record:", error);
      Alert.alert("エラー", "出庫入力に失敗しました");
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      const formattedDate = date.toISOString().split("T")[0];
      setForm({ ...form, date: formattedDate });
      setSelectedDate(date);
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

  const selectedPart = parts.find((p) => p.id === form.partId);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScreenContainer className="p-4">
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            paddingBottom: 200,
          }}
        >
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
          <Pressable
            onPress={() => {
              setShowDatePicker(true);
              const [year, month, day] = form.date.split("-");
              setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <View className="bg-surface border border-border rounded-lg px-4 py-3">
              <Text className="text-foreground">{form.date}</Text>
            </View>
          </Pressable>
        </View>

        {showDatePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            textColor="#000"
          />
        )}

        {/* 伝票番号 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">伝票番号 *</Text>
          <TextInput
            ref={voucherInputRef}
            placeholder="伝票番号を入力"
            value={form.voucherNumber}
            onChangeText={(text) => setForm({ ...form, voucherNumber: text })}
            onFocus={() => {
              setTimeout(() => {
                voucherInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                  scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
                });
              }, 100);
            }}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
            placeholderTextColor="#999"
          />
        </View>

        {/* ナンバー */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">ナンバー（下4桁） *</Text>
          <TextInput
            ref={vehicleInputRef}
            placeholder="下4桁を入力"
            value={form.vehicleNumber}
            onChangeText={(text) => setForm({ ...form, vehicleNumber: text.slice(0, 4) })}
            onFocus={() => {
              setTimeout(() => {
                vehicleInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                  scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
                });
              }, 100);
            }}
            maxLength={4}
            keyboardType="numeric"
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
            placeholderTextColor="#999"
          />
        </View>

        {/* 顧客名 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">顧客名 *</Text>
          <TextInput
            ref={customerInputRef}
            placeholder="顧客名を入力"
            value={form.customerName}
            onChangeText={(text) => setForm({ ...form, customerName: text })}
            onFocus={() => {
              setTimeout(() => {
                customerInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                  scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
                });
              }, 100);
            }}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
            placeholderTextColor="#999"
          />
          {form.vehicleNumber.length === 4 && (
            <Text className="text-xs text-muted mt-1">
              💡 ナンバーから自動検出した顧客名を編集できます
            </Text>
          )}
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
          <Text className="text-sm font-semibold text-foreground mb-2">
            数量 {selectedPart?.allowDecimal ? "（小数対応）" : ""}
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => handleQuantityChange(selectedPart?.allowDecimal ? -0.1 : -1)}
              disabled={!selectedPart}
              className="bg-surface border border-border rounded-lg w-12 h-12 items-center justify-center"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-lg font-bold text-foreground">−</Text>
            </Pressable>
            <TextInput
              ref={quantityInputRef}
              value={quantityInputText}
              onChangeText={handleQuantityTextChange}
              onFocus={() => {
                setTimeout(() => {
                  quantityInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                    scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
                  });
                }, 100);
              }}
              keyboardType="numbers-and-punctuation"
              className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-center text-foreground text-base"
              placeholderTextColor="#999"
            />
            <Pressable
              onPress={() => handleQuantityChange(selectedPart?.allowDecimal ? 0.1 : 1)}
              disabled={!selectedPart}
              className="bg-surface border border-border rounded-lg w-12 h-12 items-center justify-center"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-lg font-bold text-foreground">+</Text>
            </Pressable>
          </View>
          {selectedPart?.allowDecimal && (
            <Text className="text-xs text-muted mt-1">
              💡 小数点入力可能（例：0.5, 1.5）・小数第1位まで
            </Text>
          )}
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
                {partSearchText === "" && frequentParts.length > 0 && (
                  <View className="mt-3">
                    <Text className="text-xs font-semibold text-muted mb-2">⭐ よく使う部品</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {frequentParts.map((part) => (
                        <Pressable
                          key={part.id}
                          onPress={() => {
                            setForm({ ...form, partId: part.id, partName: part.name });
                            setIsPartModalVisible(false);
                            setPartSearchText("");
                          }}
                          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                          className="bg-primary rounded-lg px-3 py-1"
                        >
                          <Text className="text-xs text-white font-semibold">{part.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
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
    </KeyboardAvoidingView>
  );
}
