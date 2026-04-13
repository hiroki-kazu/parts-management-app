/**
 * ナンバー検索・履歴画面
 * 車両ナンバー（下4桁）で過去の使用履歴を検索
 */

import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import {
  getOutboundRecordsByVehicleNumber,
  getCustomerByVehicleNumber,
} from "@/lib/storage";
import { OutboundRecord } from "@/lib/types";

export default function SearchScreen() {
  const router = useRouter();
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [records, setRecords] = useState<OutboundRecord[]>([]);
  const [isSearched, setIsSearched] = useState(false);

  const handleSearch = async () => {
    try {
      if (!vehicleNumber || vehicleNumber.length !== 4) {
        Alert.alert("エラー", "ナンバー（下4桁）を入力してください");
        return;
      }

      const foundRecords = await getOutboundRecordsByVehicleNumber(vehicleNumber);
      const customer = await getCustomerByVehicleNumber(vehicleNumber);

      setRecords(foundRecords);
      setCustomerName(customer?.name || "未登録");
      setIsSearched(true);
    } catch (error) {
      console.error("Error searching records:", error);
      Alert.alert("エラー", "検索に失敗しました");
    }
  };

  const renderRecordItem = ({ item, index }: { item: OutboundRecord; index: number }) => (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-sm text-muted">#{index + 1}</Text>
          <Text className="text-lg font-semibold text-foreground">{item.partName}</Text>
        </View>
        <Text className="text-lg font-bold text-primary">{item.quantity}個</Text>
      </View>

      <View className="border-t border-border pt-3 mt-3">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-muted">日付</Text>
          <Text className="text-sm font-semibold text-foreground">{item.date}</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-muted">伝票番号</Text>
          <Text className="text-sm font-semibold text-foreground">{item.voucherNumber}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-muted">顧客名</Text>
          <Text className="text-sm font-semibold text-foreground">{item.customerName}</Text>
        </View>
      </View>
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
          <Text className="text-2xl font-bold text-foreground">履歴を見る</Text>
        </View>

        {/* 検索フィールド */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">ナンバー（下4桁）</Text>
          <View className="flex-row gap-2">
            <TextInput
              placeholder="下4桁を入力"
              value={vehicleNumber}
              onChangeText={(text) => setVehicleNumber(text.slice(0, 4))}
              maxLength={4}
              keyboardType="numeric"
              className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
              placeholderTextColor="#999"
            />
            <Pressable
              onPress={handleSearch}
              className="bg-primary rounded-lg px-6 py-3 justify-center"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-white font-semibold">検索</Text>
            </Pressable>
          </View>
        </View>

        {/* 検索結果 */}
        {isSearched && (
          <>
            {/* 顧客情報 */}
            <View className="bg-primary/10 rounded-lg p-4 mb-4 border border-primary">
              <Text className="text-sm text-muted mb-1">ナンバー</Text>
              <Text className="text-lg font-bold text-foreground mb-2">{vehicleNumber}</Text>
              <Text className="text-sm text-muted mb-1">顧客名</Text>
              <Text className="text-lg font-semibold text-primary">{customerName}</Text>
            </View>

            {/* 履歴リスト */}
            {records.length > 0 ? (
              <>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-sm font-semibold text-foreground">
                    使用履歴（{records.length}件）
                  </Text>
                </View>
                <FlatList
                  data={records}
                  renderItem={renderRecordItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={true}
                />
              </>
            ) : (
              <View className="items-center justify-center py-8">
                <Text className="text-muted">この車両の使用履歴がありません</Text>
              </View>
            )}
          </>
        )}

        {!isSearched && (
          <View className="items-center justify-center py-12">
            <Text className="text-lg text-muted">ナンバーを入力して検索</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
