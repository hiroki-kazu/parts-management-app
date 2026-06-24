/**
 * データ処理画面
 * 期間指定エクスポート・部品リストCSVテンプレート・部品リストCSVインポート
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
  generatePartsCSVTemplate,
  importPartsFromCSV,
} from "@/lib/storage";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as MailComposer from "expo-mail-composer";

import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";






export default function DataProcessingScreen() {
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

  const handleSendTemplate = async () => {
    try {
      setIsProcessing(true);
      const templateCsv = await generatePartsCSVTemplate();
      
      // UTF-8 BOMを追加
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + templateCsv;
      
      // テンプレートファイルを作成
      const fileName = `部品テンプレート_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, csvWithBOM, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // MailComposerでメール送信
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [],
          subject: '部品リスト インポートテンプレート',
          body: '添付したCSVテンプレートを使用して、部品情報を追加してください。',
          attachments: [filePath],
        });
      } else {
        Alert.alert('エラー', 'メール機能が利用できません');
      }
      
      Alert.alert('送信完了', `${fileName}がメールに添付されました。`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sending template:', error);
      Alert.alert('エラー', 'テンプレート送信に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportCSV = async () => {
    try {
      setIsProcessing(true);
      
      // ドキュメントピッカーを起動
      // AndroidではMIMEタイプが厳しいため、複数のタイプを指定
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        setIsProcessing(false);
        return;
      }
      
      // ファイルを読み込み
      const fileUri = result.assets[0].uri;
      const csvContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // BOMを削除
      const cleanedContent = csvContent.replace(/^\uFEFF/, '');
      
      // CSVをインポート
      const importResult = await importPartsFromCSV(cleanedContent);
      
      // 結果を表示
      let message = `成功: ${importResult.success}件`;
      if (importResult.failed > 0) {
        message += `\n失敗: ${importResult.failed}件`;
        if (importResult.errors.length > 0) {
          message += `\n\nエラー:\n${importResult.errors.slice(0, 3).join('\n')}`;
          if (importResult.errors.length > 3) {
            message += `\n他${importResult.errors.length - 3}件...`;
          }
        }
      }
      
      Alert.alert('インポート完了', message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error importing CSV:', error);
      Alert.alert('エラー', 'CSVインポートに失敗しました');
    } finally {
      setIsProcessing(false);
    }
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
          <Text className="text-2xl font-bold text-foreground">データ処理</Text>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">1. 期間指定エクスポート</Text>
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
          <Text className="text-sm font-semibold text-foreground mb-2">2. 部品リストCSV</Text>

          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">📄 テンプレートをメール送信</Text>
            <Text className="text-xs text-muted mb-3">
              部品マスタのテンプレートCSVをメール送信します
            </Text>
            <Pressable
              onPress={handleSendTemplate}
              disabled={isProcessing}
              style={(({ pressed }) => [{
                backgroundColor: '#06b6d4',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: isProcessing ? 0.5 : (pressed ? 0.7 : 1),
              }])}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-white font-bold">テンプレートを送信</Text>
              )}
            </Pressable>
          </View>

          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">📁 CSVをインポート</Text>
            <Text className="text-xs text-muted mb-3">
              部品リストCSVを選択して一括追加
            </Text>
            <Pressable
              onPress={handleImportCSV}
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
                <Text className="text-center text-white font-bold">CSVを選択してインポート</Text>
              )}
            </Pressable>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">3. 期間指定エクスポート</Text>

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
