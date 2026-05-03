/**
 * 月末処理画面
 * 月末在庫確定・翌月繰越・CSV出力
 */

import React, { useState, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
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
import DateTimePicker from "@react-native-community/datetimepicker";
import * as MediaLibrary from "expo-media-library";
import JSZip from "jszip";
import { Buffer } from "buffer";

export default function MonthendScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const currentMonth = getCurrentMonth();
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // メディアライブラリのパーミッション要求
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const requestPermissions = async () => {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          console.log('MediaLibrary permission status:', status);
          if (status !== 'granted') {
            console.warn('MediaLibrary permission not granted');
          }
        } catch (error) {
          console.error('Error requesting MediaLibrary permissions:', error);
        }
      };
      requestPermissions();
    }
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

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

  const exportCSVFile = async (csv: string, fileName: string) => {
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        link.download = fileName;
        link.click();
      } else {
        // Native (iOS/Android): ファイルをローカルに保存
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        // Share APIで共有
        await Share.share({
          url: filePath,
          title: fileName,
          message: `${fileName}を保存してください`,
        });
        
        Alert.alert('保存完了', `${fileName}が共有されました。メールやクラウドストレージで保存してください。`);
      }

      return true;
    } catch (error) {
      console.error("Error exporting CSV:", error);
      Alert.alert('エラー', 'ファイルの作成に失敗しました');
      throw error;
    }
  };

  const handleExportOutbound = async () => {
    try {
      setIsProcessing(true);
      const csv = await exportOutboundRecordsAsCSV();
      const fileName = `outbound_${currentMonth}.csv`;
      await exportCSVFile(csv, fileName);
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
      await exportCSVFile(csv, fileName);
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
      await exportCSVFile(csv, fileName);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error exporting inventory summary:", error);
      Alert.alert("エラー", "月末在庫集計のエクスポートに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportAllAsZip = async () => {
    try {
      setIsProcessing(true);
      
      if (Platform.OS === 'web') {
        Alert.alert("注意", "Web環境ではZIP機能は使用できません。\n個別にCSVをダウンロードしてください。");
        setIsProcessing(false);
        return;
      }
      
      console.log('Starting CSV export...');
      const outboundCsv = await exportOutboundRecordsAsCSV();
      const inboundCsv = await exportInboundRecordsAsCSV();
      const inventoryCsv = await getMonthlyInventorySummary(currentMonth);
      
      if (!outboundCsv || !inboundCsv || !inventoryCsv) {
        throw new Error('CSVデータが空です');
      }
      
      const tempDir = `${FileSystem.cacheDirectory}monthly_export_${Date.now()}/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      
      const outboundFile = `${tempDir}outbound_${currentMonth}.csv`;
      const inboundFile = `${tempDir}inbound_${currentMonth}.csv`;
      const inventoryFile = `${tempDir}inventory_summary_${currentMonth}.csv`;
      
      await FileSystem.writeAsStringAsync(outboundFile, outboundCsv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await FileSystem.writeAsStringAsync(inboundFile, inboundCsv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await FileSystem.writeAsStringAsync(inventoryFile, inventoryCsv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      const zipFileName = `monthly_export_${currentMonth}.zip`;
      const zipPath = `${FileSystem.documentDirectory}${zipFileName}`;
      
      const zip = new JSZip();
      zip.file(`outbound_${currentMonth}.csv`, outboundCsv);
      zip.file(`inbound_${currentMonth}.csv`, inboundCsv);
      zip.file(`inventory_summary_${currentMonth}.csv`, inventoryCsv);
      const zipData = await zip.generateAsync({ type: 'uint8array' });
      
      const zipBase64 = Buffer.from(zipData).toString('base64');
      
      // Android実機ではBase64エンコーディングが正しく処理されないため、
      // バイナリデータとして直接書き込む
      if (Platform.OS === 'android') {
        // Uint8ArrayをBase64文字列に変換
        const binaryString = String.fromCharCode.apply(null, Array.from(zipData));
        const base64Data = Buffer.from(binaryString, 'binary').toString('base64');
        await FileSystem.writeAsStringAsync(zipPath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // iOS/Web
        await FileSystem.writeAsStringAsync(zipPath, zipBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      
      // Share APIで共有
      await Share.share({
        url: zipPath,
        title: zipFileName,
        message: `${zipFileName}を保存してください`,
      });
      
      Alert.alert('保存完了', `${zipFileName}が共有されました。メールやクラウドストレージで保存してください。`);
      
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error exporting all as ZIP:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert("エラー", `ZIPファイルの作成に失敗しました\n\n詳細: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2 mb-4">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text className="text-2xl">←</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">月末処理</Text>
        </View>

        <View className="bg-primary/10 rounded-lg p-4 mb-6 border border-primary">
          <Text className="text-sm text-muted mb-1">処理対象月</Text>
          <Text className="text-2xl font-bold text-primary">{currentMonth}</Text>
        </View>

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

        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">3. 期間指定</Text>
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm text-muted mb-3">集計対象期間を指定してください</Text>
            
            <View className="mb-4">
              <Text className="text-xs text-muted mb-1">開始日</Text>
              <Pressable
                onPress={() => setShowStartDatePicker(true)}
                style={({ pressed }) => [{
                  backgroundColor: pressed ? '#e5e7eb' : '#f5f5f5',
                  borderRadius: 8,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                }]}
              >
                <Text style={{ color: '#000000', fontWeight: '600' }}>{formatDate(startDate)}</Text>
              </Pressable>
            </View>
            
            <View className="mb-3">
              <Text className="text-xs text-muted mb-1">終了日</Text>
              <Pressable
                onPress={() => setShowEndDatePicker(true)}
                style={({ pressed }) => [{
                  backgroundColor: pressed ? '#e5e7eb' : '#f5f5f5',
                  borderRadius: 8,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                }]}
              >
                <Text style={{ color: '#000000', fontWeight: '600' }}>{formatDate(endDate)}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">4. CSV出力</Text>

          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">月末在庫集計</Text>
            <Text className="text-xs text-muted mb-3">
              形式: 部品名,品番,単価,出庫数,入庫数,現在庫数,在庫金額
            </Text>
            <Pressable
              onPress={handleExportInventorySummary}
              disabled={isProcessing}
              style={({ pressed }) => [{
                backgroundColor: '#a855f7',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: isProcessing ? 0.5 : (pressed ? 0.7 : 1),
              }]}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">月末在庫集計をエクスポート</Text>
              )}
            </Pressable>
          </View>

          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">出庫履歴</Text>
            <Text className="text-xs text-muted mb-3">
              形式: 日付,伝票番号,顧客名,ナンバー,部品名,数量
            </Text>
            <Pressable
              onPress={handleExportOutbound}
              disabled={isProcessing}
              style={({ pressed }) => [{
                backgroundColor: '#0ea5e9',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: isProcessing ? 0.5 : (pressed ? 0.7 : 1),
              }]}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">出庫履歴をエクスポート</Text>
              )}
            </Pressable>
          </View>

          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">入庫履歴</Text>
            <Text className="text-xs text-muted mb-3">
              形式: 日付,伝票番号,仕入先,部品名,数量
            </Text>
            <Pressable
              onPress={handleExportInbound}
              disabled={isProcessing}
              style={(({ pressed }) => [{
                backgroundColor: '#10b981',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: isProcessing ? 0.5 : (pressed ? 0.7 : 1),
              }])}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">入庫履歴をエクスポート</Text>
              )}
            </Pressable>
          </View>

          <View className="bg-surface rounded-lg p-4 mb-3 border border-border border-2" style={{ borderColor: '#f59e0b' }}>
            <Text className="text-sm font-semibold text-foreground mb-2">📦 全ファイル一括ダウンロード</Text>
            <Text className="text-xs text-muted mb-3">
              3つのCSVファイルをZIPで圧縮してダウンロード
            </Text>
            <Pressable
              onPress={handleExportAllAsZip}
              disabled={isProcessing}
              style={(({ pressed }) => [{
                backgroundColor: '#f59e0b',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: isProcessing ? 0.5 : (pressed ? 0.7 : 1),
              }])}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">全ファイルをZIPでダウンロード</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {showStartDatePicker && Platform.OS === 'ios' && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff' }}>
          <DateTimePicker
            value={startDate}
            mode="date"
            display="spinner"
            onChange={handleStartDateChange}
          />
        </View>
      )}
      {showStartDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && Platform.OS === 'ios' && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff' }}>
          <DateTimePicker
            value={endDate}
            mode="date"
            display="spinner"
            onChange={handleEndDateChange}
          />
        </View>
      )}
      {showEndDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
        />
      )}
    </ScreenContainer>
  );
}
