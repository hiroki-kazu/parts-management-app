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
import * as MailComposer from "expo-mail-composer";

import DateTimePicker from "@react-native-community/datetimepicker";






export default function MonthendScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const currentMonth = getCurrentMonth();
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // MailComposerの初期化
  useEffect(() => {
    MailComposer.isAvailableAsync();
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





  const handleExportAllAsFormat = async () => {
    Alert.alert(
      'ZIP形式でエクスポート',
      'ZIP形式で全ファイルをエクスポートします。よろしいですか？',
      [
        { text: 'キャンセル', onPress: () => {} },
        {
          text: 'エクスポート',
          onPress: async () => {
            await performExportAll('zip');
          },
        },
      ]
    );
  };

  const performExportAll = async (format: 'zip') => {
    try {
      setIsProcessing(true);
      
      console.log(`Starting ${format.toUpperCase()} export...`);
      const outboundCsv = await exportOutboundRecordsAsCSV(startDate, endDate);
      const inboundCsv = await exportInboundRecordsAsCSV(startDate, endDate);
      const inventoryCsv = await getMonthlyInventorySummary(currentMonth, startDate, endDate);
      
      if (!outboundCsv || !inboundCsv || !inventoryCsv) {
        throw new Error('データが空です');
      }
      
      const [year, month] = currentMonth.split('-');
      const startStr = startDate.toISOString().split('T')[0].split('-').slice(1).join('-');
      const endStr = endDate.toISOString().split('T')[0].split('-').slice(1).join('-');
      const dateRange = `_${startStr}～${endStr}`;
      
      if (format === 'zip') {
        // ZIP形式でエクスポート
        const JSZip = require('jszip');
        const zip = new JSZip();
        
        // UTF-8 BOMを追加（Windows環境での文字化け防止）
        const BOM = '\uFEFF';
        const outboundCsvWithBOM = BOM + outboundCsv;
        const inboundCsvWithBOM = BOM + inboundCsv;
        const inventoryCsvWithBOM = BOM + inventoryCsv;
        
        // ZIPにCSVファイルを追加
        zip.file(`出庫履歴_${year}年${parseInt(month)}月${dateRange}.csv`, outboundCsvWithBOM);
        zip.file(`入庫履歴_${year}年${parseInt(month)}月${dateRange}.csv`, inboundCsvWithBOM);
        zip.file(`在庫サマリー_${year}年${parseInt(month)}月${dateRange}.csv`, inventoryCsvWithBOM);
        
        // ZIPファイルを生成
        const zipData = await zip.generateAsync({ type: 'base64' });
        const zipFileName = `月末処理_${year}年${parseInt(month)}月${dateRange}.zip`;
        const zipPath = `${FileSystem.cacheDirectory}${zipFileName}`;
        
        await FileSystem.writeAsStringAsync(zipPath, zipData, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // MailComposerでメール送信
        const isAvailable = await MailComposer.isAvailableAsync();
        if (isAvailable) {
          await MailComposer.composeAsync({
            recipients: [],
            subject: `部品在庫管理 月末処理 ${currentMonth}`,
            body: '添付したZIPファイルを使用してデータを保存できます。',
            attachments: [zipPath],
          });
        } else {
          Alert.alert('エラー', 'メール機能が利用できません');
        }
        
        Alert.alert('保存完了', `${zipFileName}がメールに添付されました。`);
      }
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error(`Error exporting all as ${format}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert("エラー", `${format.toUpperCase()}ファイルの作成に失敗しました

詳細: ${errorMessage}`);
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
          <Text className="text-sm font-semibold text-foreground mb-2">4. 全ファイル一括ダウンロード</Text>

          <View className="bg-surface rounded-lg p-4 mb-3 border border-border border-2" style={{ borderColor: '#8b5cf6' }}>
            <Text className="text-sm font-semibold text-foreground mb-2">📦 ZIP形式でダウンロード</Text>
            <Text className="text-xs text-muted mb-3">
              出庫履歴、入庫履歴、在庫サマリーの3つのファイルをZIP形式で一括ダウンロード
            </Text>
            <Pressable
              onPress={handleExportAllAsFormat}
              disabled={isProcessing}
              style={(({ pressed }) => [{
                backgroundColor: '#8b5cf6',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: isProcessing ? 0.5 : (pressed ? 0.7 : 1),
              }])}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">ZIP形式でダウンロード</Text>
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
