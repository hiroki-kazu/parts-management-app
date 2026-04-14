/**
 * 月末処理画面
 * 月末在庫確定・翌月繰越・CSV出力
 */

import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import {
  getCurrentMonth,
  saveMonthlySnapshot,
  exportOutboundRecordsAsCSV,
  exportInboundRecordsAsCSV,
  getMonthlyInventorySummary,
} from "@/lib/storage";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";

export default function MonthendScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const currentMonth = getCurrentMonth();

  const handleMonthlyClosing = async () => {
    Alert.alert(
      "月末確定",
      `${currentMonth}の在庫を確定します。よろしいですか？`,
      [
        { text: "キャンセル", onPress: () => {} },
        {
          text: "確定",
          onPress: async () => {
            try {
              setIsProcessing(true);
              await saveMonthlySnapshot(currentMonth);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("成功", `${currentMonth}の在庫確定が完了しました`);
            } catch (error) {
              console.error("Error closing month:", error);
              Alert.alert("エラー", "月末確定に失敗しました");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleCarryover = () => {
    Alert.alert(
      "翌月繰越",
      `${currentMonth}の在庫を翌月に繰越します。\n（現在の在庫数が翌月の初期在庫になります）`,
      [
        { text: "キャンセル", onPress: () => {} },
        {
          text: "繰越",
          onPress: async () => {
            try {
              setIsProcessing(true);
              // 翌月繰越は自動的に行われます（現在の在庫が次月の初期値）
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("成功", "翌月への繰越が完了しました");
            } catch (error) {
              console.error("Error carrying over:", error);
              Alert.alert("エラー", "翌月繰越に失敗しました");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleExportOutbound = async () => {
    try {
      setIsProcessing(true);
      const csv = await exportOutboundRecordsAsCSV();
      const fileName = `outbound_${currentMonth}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // ファイル共有
      await Share.share({
        url: `file://${filePath}`,
        title: "出庫履歴CSV",
        message: `${currentMonth}の出庫履歴をエクスポートしました`,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error exporting outbound records:", error);
      Alert.alert("エラー", "出庫履歴のエクスポートに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportInbound = async () => {
    try {
      setIsProcessing(true);
      const csv = await exportInboundRecordsAsCSV();
      const fileName = `inbound_${currentMonth}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // ファイル共有
      await Share.share({
        url: `file://${filePath}`,
        title: "入庫履歴CSV",
        message: `${currentMonth}の入庫履歴をエクスポートしました`,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error exporting inbound records:", error);
      Alert.alert("エラー", "入庫履歴のエクスポートに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportInventorySummary = async () => {
    try {
      setIsProcessing(true);
      const csv = await getMonthlyInventorySummary(currentMonth);
      const fileName = `inventory_summary_${currentMonth}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // ファイル共有
      await Share.share({
        url: `file://${filePath}`,
        title: "月末在庫集計CSV",
        message: `${currentMonth}の月末在庫集計をエクスポートしました`,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error exporting inventory summary:", error);
      Alert.alert("エラー", "月末在庫集計のエクスポートに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ヘッダー */}
        <View className="flex-row items-center gap-2 mb-4">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text className="text-2xl">←</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">月末処理</Text>
        </View>

        {/* 現在の月 */}
        <View className="bg-primary/10 rounded-lg p-4 mb-6 border border-primary">
          <Text className="text-sm text-muted mb-1">処理対象月</Text>
          <Text className="text-2xl font-bold text-primary">{currentMonth}</Text>
        </View>

        {/* 月末確定 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">1. 月末確定</Text>
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm text-muted mb-3">
              現在の在庫数を月末在庫として確定します。
            </Text>
            <Pressable
              onPress={handleMonthlyClosing}
              disabled={isProcessing}
              className="bg-primary rounded-lg py-3"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">月末確定</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* 翌月繰越 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">2. 翌月繰越</Text>
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm text-muted mb-3">
              現在の在庫数を翌月の初期在庫として繰越します。
            </Text>
            <Pressable
              onPress={handleCarryover}
              disabled={isProcessing}
              className="bg-primary rounded-lg py-3"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">翌月繰越</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* CSV出力 */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">3. CSV出力</Text>

          {/* 月末在庫集計 */}
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">月末在庫集計</Text>
            <Text className="text-xs text-muted mb-3">
              形式: 部品名,品番,単価,出庫数,入庫数,現在庫数,在庫金額
            </Text>
            <Pressable
              onPress={handleExportInventorySummary}
              disabled={isProcessing}
              className="bg-purple-500 rounded-lg py-3"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">月末在庫集計をエクスポート</Text>
              )}
            </Pressable>
          </View>

          {/* 出庫履歴 */}
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">出庫履歴</Text>
            <Text className="text-xs text-muted mb-3">
              形式: 日付,伝票番号,顧客名,ナンバー,部品名,数量
            </Text>
            <Pressable
              onPress={handleExportOutbound}
              disabled={isProcessing}
              className="bg-blue-500 rounded-lg py-3"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">出庫履歴をエクスポート</Text>
              )}
            </Pressable>
          </View>

          {/* 入庫履歴 */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">入庫履歴</Text>
            <Text className="text-xs text-muted mb-3">
              形式: 日付,伝票番号,仕入先,部品名,数量
            </Text>
            <Pressable
              onPress={handleExportInbound}
              disabled={isProcessing}
              className="bg-green-500 rounded-lg py-3"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">入庫履歴をエクスポート</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* 注意事項 */}
        <View className="bg-warning/10 rounded-lg p-4 border border-warning">
          <Text className="text-sm font-semibold text-warning mb-2">⚠ 注意事項</Text>
          <Text className="text-xs text-muted leading-relaxed">
            • 月末確定後、翌月の処理を開始してください{"\n"}
            • CSV出力は複数回実行可能です{"\n"}
            • データは自動的にバックアップされます
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
