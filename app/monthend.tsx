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
  importPartsFromCSVWithOverwrite,
  generateOutboundRecordsCSVTemplate,
  generateInboundRecordsCSVTemplate,
  importOutboundRecordsFromCSV,
  importInboundRecordsFromCSV,
  getOutboundRecords,
  getInboundRecords,
  getAppSettings,
  sanitizeExportName,
} from "@/lib/storage";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as MailComposer from "expo-mail-composer";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { decodeCSVBase64, normalizeCSVText, escapeCSV, parseCSV } from "@/lib/csv";

async function readCSVFile(uri: string): Promise<{ text: string; encoding: string }> {
  try {
    // AndroidのExcelはShift-JISで保存することがあるため、まずバイト列として読み込みます。
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return decodeCSVBase64(base64);
  } catch (error) {
    // Webや一部のファイルプロバイダーでBase64読み込みが使えない場合のフォールバック。
    console.warn("CSV Base64 read failed, falling back to UTF-8:", error);
    const text = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return { text: normalizeCSVText(text), encoding: "UTF8" };
  }
}

function formatHistoryImportMessage(
  result: { success: number; failed: number; errors: string[] },
  encoding: string,
): string {
  const encodingLabel = encoding === "SJIS" ? "Shift-JIS" : encoding;
  let message = `文字コード: ${encodingLabel}\n成功: ${result.success}件\n失敗: ${result.failed}件`;
  if (result.errors.length > 0) {
    message += `\n\n確認してください:\n${result.errors.slice(0, 3).join("\n")}`;
    if (result.errors.length > 3) {
      message += `\n他${result.errors.length - 3}件...`;
    }
  }
  return message;
}

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
      const bomCsv = '\uFEFF' + templateCsv;
      
      // ファイルに保存
      const filename = `部品テンプレート_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, bomCsv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // メール送信
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          subject: '部品リストCSVテンプレート',
          body: '部品リストのテンプレートCSVファイルを添付しています。\n\nこのファイルを編集して、部品情報をインポートしてください。',
          attachments: [fileUri],
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('エラー', 'メール機能が利用できません');
      }
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
      
      // ファイルを文字コード判定付きで読み込み
      const fileUri = result.assets[0].uri;
      const { text: cleanedContent } = await readCSVFile(fileUri);
      
      // CSVをインポート
      const importResult = await importPartsFromCSV(cleanedContent);
      
      // 重複部品がある場合は確認ポップアップを表示
      if (importResult.duplicates && importResult.duplicates.length > 0) {
        return new Promise((resolve) => {
          Alert.alert(
            '重複部品が見つかりました',
            `${importResult.duplicates.length}件の重複部品が見つかりました。\n上書きしますか？`,
            [
              {
                text: 'キャンセル',
                onPress: () => {
                  setIsProcessing(false);
                  resolve(null);
                },
                style: 'cancel',
              },
              {
                text: 'スキップ',
                onPress: () => {
                  // 重複部品をスキップして、新規部品のみをインポート
                  let message = `成功: ${importResult.success}件`;
                  if (importResult.duplicates.length > 0) {
                    message += `\nスキップ: ${importResult.duplicates.length}件（重複）`;
                  }
                  if (importResult.failed > 0) {
                    message += `\n失敗: ${importResult.failed}件`;
                  }
                  Alert.alert('インポート完了', message);
                  setIsProcessing(false);
                  resolve(null);
                },
              },
              {
                text: '上書き',
                onPress: async () => {
                  try {
                    // 重複部品を上書き
                    const overwriteRows = importResult.duplicates.map((_, idx) => idx);
                    const overwriteResult = await importPartsFromCSVWithOverwrite(cleanedContent, overwriteRows);
                    
                    let message = `成功: ${overwriteResult.success}件`;
                    if (overwriteResult.failed > 0) {
                      message += `\n失敗: ${overwriteResult.failed}件`;
                      if (overwriteResult.errors.length > 0) {
                        message += `\n\nエラー:\n${overwriteResult.errors.slice(0, 3).join('\n')}`;
                        if (overwriteResult.errors.length > 3) {
                          message += `\n他${overwriteResult.errors.length - 3}件...`;
                        }
                      }
                    }
                    
                    Alert.alert('インポート完了', message);
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setIsProcessing(false);
                    resolve(null);
                  } catch (error) {
                    console.error('Error overwriting parts:', error);
                    Alert.alert('エラー', 'CSVインポート（上書き）に失敗しました');
                    setIsProcessing(false);
                    resolve(null);
                  }
                },
              },
            ]
          );
        });
      }
      
      // 重複部品がない場合の結果表示
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




  const handleSendOutboundTemplate = async () => {
    try {
      setIsProcessing(true);
      const csvContent = await generateOutboundRecordsCSVTemplate();
      const bomCsv = '\uFEFF' + csvContent;
      const filename = `出庫履歴テンプレート_${new Date().toISOString().split('T')[0]}.csv`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(path, bomCsv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          subject: `出庫履歴テンプレート`,
          body: `出庫履歴をCSVで一括登録するためのテンプレートです。\n\n必須項目: 日付,伝票番号,車両ナンバー,顧客名,品番,部品名,数量\n品番を優先して部品マスタと照合します。列名は変更しないでください。`,
          attachments: [path],
        });
        Alert.alert('成功', `${filename}がメールに添付されました`);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('エラー', 'テンプレート送信に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendInboundTemplate = async () => {
    try {
      setIsProcessing(true);
      const csvContent = await generateInboundRecordsCSVTemplate();
      const bomCsv = '\uFEFF' + csvContent;
      const filename = `入庫履歴テンプレート_${new Date().toISOString().split('T')[0]}.csv`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(path, bomCsv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          subject: `入庫履歴テンプレート`,
          body: `入庫履歴をCSVで一括登録するためのテンプレートです。\n\n形式: 日付,伝票番号,仕入先,部品名,品番,数量`,
          attachments: [path],
        });
        Alert.alert('成功', `${filename}がメールに添付されました`);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('エラー', 'テンプレート送信に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportOutboundRecords = async () => {
    try {
      setIsProcessing(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const { text: fileContent, encoding } = await readCSVFile(fileUri);
      
      const importResult = await importOutboundRecordsFromCSV(fileContent);
      const savedRecords = await getOutboundRecords();
      const message = `${formatHistoryImportMessage(importResult, encoding)}\n保存済み出庫履歴: ${savedRecords.length}件`;
      Alert.alert(
        importResult.success > 0 ? '出庫履歴インポート完了' : '出庫履歴を追加できませんでした',
        message,
        importResult.success > 0
          ? [
              { text: '閉じる', style: 'cancel' },
              {
                text: '履歴を確認',
                onPress: () => router.push({
                  pathname: '/search',
                  params: { recordType: 'outbound', showAll: '1' },
                }),
              },
            ]
          : [{ text: 'OK' }],
      );
      await Haptics.notificationAsync(
        importResult.success > 0
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    } catch (error) {
      Alert.alert('エラー', 'インポートに失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportInboundRecords = async () => {
    try {
      setIsProcessing(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const { text: fileContent, encoding } = await readCSVFile(fileUri);
      
      const importResult = await importInboundRecordsFromCSV(fileContent);
      const savedRecords = await getInboundRecords();
      const message = `${formatHistoryImportMessage(importResult, encoding)}\n保存済み入庫履歴: ${savedRecords.length}件`;
      Alert.alert(
        importResult.success > 0 ? '入庫履歴インポート完了' : '入庫履歴を追加できませんでした',
        message,
        importResult.success > 0
          ? [
              { text: '閉じる', style: 'cancel' },
              {
                text: '履歴を確認',
                onPress: () => router.push({
                  pathname: '/search',
                  params: { recordType: 'inbound', showAll: '1' },
                }),
              },
            ]
          : [{ text: 'OK' }],
      );
      await Haptics.notificationAsync(
        importResult.success > 0
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    } catch (error) {
      Alert.alert('エラー', 'インポートに失敗しました');
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

  const handleSaveZipToDevice = async (zipPath: string, zipFilename: string) => {
    if (Platform.OS === 'web') {
      Alert.alert('保存できません', 'タブレット本体への保存はAndroid版で利用してください。');
      return;
    }

    try {
      if (Platform.OS === 'android') {
        const initialDirectoryUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
        const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
          initialDirectoryUri,
        );

        if (!permission.granted) {
          Alert.alert('保存をキャンセルしました', '保存先フォルダが選択されませんでした。');
          return;
        }

        const fileNameWithoutExtension = zipFilename.replace(/\\.zip$/i, '');
        const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          fileNameWithoutExtension,
          'application/zip',
        );
        const zipBase64 = await FileSystem.readAsStringAsync(zipPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.StorageAccessFramework.writeAsStringAsync(destinationUri, zipBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert('保存完了', `${zipFilename}を選択したフォルダに保存しました。`);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('保存できません', 'この端末ではファイル共有機能を利用できません。');
        return;
      }

      await Sharing.shareAsync(zipPath, {
        mimeType: 'application/zip',
        UTI: 'public.zip-archive',
        dialogTitle: 'ZIPファイルを保存・共有',
      });
    } catch (error) {
      console.error('Error saving ZIP to device:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('保存エラー', `ZIPファイルを本体へ保存できませんでした。\\n\\n詳細: ${errorMessage}`);
    }
  };

  const handleEmailZip = async (zipPath: string, zipFilename: string, startStr: string, endStr: string) => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('メール送信できません', 'メール機能が利用できません。代わりに「タブレット本体へ保存」を選択してください。');
        return;
      }

      await MailComposer.composeAsync({
        subject: `データ処理 ${startStr}～${endStr}`,
        body: `期間指定エクスポートを添付しています。\\n\\n期間: ${startStr} ～ ${endStr}\\n作成者: ${zipFilename.replace(/_期間指定エクスポート_.+$/i, '')}`,
        attachments: [zipPath],
      });
      Alert.alert('メール作成完了', `${zipFilename}をメールに添付しました。`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sending ZIP by email:', error);
      Alert.alert('メール送信エラー', 'ZIPファイルのメール送信に失敗しました。');
    }
  };

  const addExportMetadata = (csv: string, displayName: string, exportedAt: string): string => {
    const rows = parseCSV(csv);
    if (rows.length === 0) return csv;

    return rows
      .map((row, index) => {
        const metadata = index === 0 ? ['作成者', '出力日時'] : [displayName, exportedAt];
        return [...row, ...metadata].map(escapeCSV).join(',');
      })
      .join('\n');
  };

  const performExportAll = async (format: 'zip') => {
    try {
      setIsProcessing(true);

      // 日付フィルタリング用のローカルタイムの日付を作成
      const startDateLocal = new Date(startDate);
      startDateLocal.setHours(0, 0, 0, 0);
      const endDateLocal = new Date(endDate);
      endDateLocal.setHours(23, 59, 59, 999);

      const startStr = startDateLocal.toISOString().split('T')[0];
      const endStr = endDateLocal.toISOString().split('T')[0];
      const { displayName } = await getAppSettings();
      const safeDisplayName = sanitizeExportName(displayName);
      const exportedAt = new Date().toISOString();
      
      const outboundCsv = await exportOutboundRecordsAsCSV(startDateLocal, endDateLocal);
      const inboundCsv = await exportInboundRecordsAsCSV(startDateLocal, endDateLocal);
      const summaryCsv = await getMonthlyInventorySummary(currentMonth, startDateLocal, endDateLocal);
      const outboundWithMetadata = addExportMetadata(outboundCsv, displayName || '未設定', exportedAt);
      const inboundWithMetadata = addExportMetadata(inboundCsv, displayName || '未設定', exportedAt);
      const summaryWithMetadata = addExportMetadata(summaryCsv, displayName || '未設定', exportedAt);

      // UTF-8 BOMを追加
      const bomOutbound = '\uFEFF' + outboundWithMetadata;
      const bomInbound = '\uFEFF' + inboundWithMetadata;
      const bomSummary = '\uFEFF' + summaryWithMetadata;

      const periodLabel = `${startStr}~${endStr}`;
      const zipFilename = `${safeDisplayName}_期間指定エクスポート_${periodLabel}.zip`;
      const zipPath = `${FileSystem.cacheDirectory}${zipFilename}`;

      const zipBase64 = await createZip([
        { name: `${safeDisplayName}_出庫履歴_${periodLabel}.csv`, content: bomOutbound },
        { name: `${safeDisplayName}_入庫履歴_${periodLabel}.csv`, content: bomInbound },
        { name: `${safeDisplayName}_在庫サマリー_${periodLabel}.csv`, content: bomSummary },
      ]);

      await FileSystem.writeAsStringAsync(zipPath, zipBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert(
        'エクスポート完了',
        `${zipFilename}を作成しました。作成者: ${displayName || '未設定'}\n保存方法を選択してください。`,
        [
          { text: '閉じる', style: 'cancel' },
          {
            text: 'タブレット本体へ保存',
            onPress: () => {
              void handleSaveZipToDevice(zipPath, zipFilename);
            },
          },
          {
            text: 'メールで送信',
            onPress: () => {
              void handleEmailZip(zipPath, zipFilename, startStr, endStr);
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error exporting:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('エラー', `エクスポートに失敗しました\n\n詳細: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const createZip = async (files: Array<{ name: string; content: string }>) => {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.name, file.content);
    }
    return zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
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

        {/* セクション1: 期間指定エクスポート */}
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

          <View className="bg-surface rounded-lg p-4 mb-3 border border-border border-2" style={{ borderColor: '#8b5cf6' }}>
            <Text className="text-sm font-semibold text-foreground mb-2">📦 ZIP形式で保存・送信</Text>
            <Text className="text-xs text-muted mb-3">
              出庫履歴、入庫履歴、在庫サマリーをZIPにまとめ、タブレット本体へ保存またはメール送信できます
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
                <Text className="text-center text-white font-bold">ZIPを作成して保存・送信</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* セクション2: 部品リストCSV */}
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



        {/* セクション3: 履歴テンプレート */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">3. 履歴テンプレート</Text>
          <Text className="text-xs text-muted mb-3">UTF-8・Shift-JIS、カンマ・タブ区切りに対応。部品名または品番で照合します。</Text>
          
          {/* 出庫履歴テンプレート */}
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">📤 出庫履歴テンプレート</Text>
            <Text className="text-xs text-muted mb-3">日付・伝票番号・車両ナンバー・顧客名・品番・部品名・数量を含み、そのまま再インポートできます</Text>
            <Pressable
              onPress={handleSendOutboundTemplate}
              disabled={isProcessing}
              style={(({ pressed }) => [{
                backgroundColor: '#06b6d4',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: isProcessing ? 0.5 : (pressed ? 0.7 : 1),
              }])}
            >
              <Text className="text-center text-white font-bold">テンプレートをメール送信</Text>
            </Pressable>
          </View>

          {/* 出庫履歴インポート */}
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-xs text-muted mb-3">必須列: 日付・伝票番号・車両ナンバー・顧客名・品番・部品名・数量。品番を優先して照合します</Text>
            <Pressable
              onPress={handleImportOutboundRecords}
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
                <Text className="text-center text-white font-bold">CSVを選択してインポート</Text>
              )}
            </Pressable>
          </View>

          {/* 入庫履歴テンプレート */}
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">📥 入庫履歴テンプレート</Text>
            <Text className="text-xs text-muted mb-3">入庫履歴をCSVで一括登録するためのテンプレートです</Text>
            <Pressable
              onPress={handleSendInboundTemplate}
              disabled={isProcessing}
              style={(({ pressed }) => [{
                backgroundColor: '#10b981',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: isProcessing ? 0.5 : (pressed ? 0.7 : 1),
              }])}
            >
              <Text className="text-center text-white font-bold">テンプレートをメール送信</Text>
            </Pressable>
          </View>

          {/* 入庫履歴インポート */}
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            <Text className="text-xs text-muted mb-3">入庫履歴CSVをインポート</Text>
            <Pressable
              onPress={handleImportInboundRecords}
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
