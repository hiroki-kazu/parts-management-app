import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { ScreenContainer } from "@/components/screen-container";
import { buildManualHtml, MANUAL_SECTIONS } from "@/lib/manual";
import { getTutorialShown, setTutorialShown } from "@/lib/storage";

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "部品在庫管理へようこそ",
    description: "出庫・入庫・在庫・履歴を、現場で分かりやすく管理するためのアプリです。",
    icon: "📦",
  },
  {
    title: "部品を使った",
    description: "日付、伝票番号、車両ナンバー、顧客名、部品、数量を入力します。複数部品は「＋ 部品追加」でまとめて登録できます。",
    icon: "📤",
  },
  {
    title: "部品を仕入れた",
    description: "日付、伝票番号、仕入先、部品、数量を入力します。仕入先候補はダブルタップで選択できます。",
    icon: "📥",
  },
  {
    title: "在庫と部品マスタ",
    description: "在庫画面で現在庫を確認し、Partsタブで品番・仕入先・単価などの部品情報を管理します。",
    icon: "🔧",
  },
  {
    title: "履歴を見る",
    description: "出庫・入庫を切り替えて期間検索できます。出庫履歴には車両ナンバーも表示されます。",
    icon: "🔍",
  },
  {
    title: "データ処理",
    description: "CSVテンプレートの送信とインポート、期間指定ZIP出力を行えます。履歴CSVは品番を優先して照合します。",
    icon: "📊",
  },
  {
    title: "PDF取扱説明書",
    description: "ヘルプ画面上部のボタンから、最新の取扱説明書をPDFにして端末・メール・クラウドへ共有できます。",
    icon: "📄",
  },
];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);

  useEffect(() => {
    const checkTutorial = async () => {
      const shown = await getTutorialShown();
      if (!shown) {
        setShowTutorial(true);
        await setTutorialShown(true);
      }
    };
    void checkTutorial();
  }, []);

  const toggleSection = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep((step) => step + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };

  const handleShowTutorial = () => {
    setCurrentStep(0);
    setShowTutorial(true);
  };

  const handleExportManualPdf = async () => {
    if (Platform.OS === "web") {
      Alert.alert("PDF出力", "PDFの保存・共有はAndroidまたはiOS版で利用してください。");
      return;
    }

    try {
      setIsCreatingPdf(true);
      const version = Constants.expoConfig?.version ?? "1.0.7";
      const html = buildManualHtml(version);
      const result = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
      });
      const pdfUri = `${FileSystem.cacheDirectory}部品在庫管理_取扱説明書.pdf`;
      const existingFile = await FileSystem.getInfoAsync(pdfUri);
      if (existingFile.exists) {
        await FileSystem.deleteAsync(pdfUri, { idempotent: true });
      }
      await FileSystem.copyAsync({ from: result.uri, to: pdfUri });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF作成完了", "PDFを作成しましたが、この端末では共有機能を利用できません。");
        return;
      }

      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "取扱説明書を保存・共有",
      });
    } catch (error) {
      console.error("Error exporting manual PDF:", error);
      Alert.alert("エラー", "取扱説明書のPDF作成に失敗しました。もう一度お試しください。");
    } finally {
      setIsCreatingPdf(false);
    }
  };

  const tutorialStep = tutorialSteps[currentStep];

  return (
    <>
      <ScreenContainer className="p-4">
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View className="gap-4">
            <View className="mb-1">
              <Text className="text-3xl font-bold text-foreground">ヘルプ・取扱説明書</Text>
              <Text className="text-sm text-muted mt-2 leading-relaxed">
                現在の機能に合わせた操作方法を確認できます。PDF版は端末への保存やメール送信が可能です。
              </Text>
            </View>

            <View className="bg-surface rounded-2xl border border-border p-4 gap-3">
              <Text className="text-lg font-bold text-foreground">取扱説明書</Text>
              <Text className="text-sm text-muted leading-relaxed">
                出庫・入庫・在庫・履歴・CSV操作をまとめたPDFを作成します。
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="取扱説明書をPDFで保存"
                disabled={isCreatingPdf}
                onPress={handleExportManualPdf}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressedButton,
                  isCreatingPdf && styles.disabledButton,
                ]}
              >
                {isCreatingPdf ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>取扱説明書をPDFで保存</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="チュートリアルを表示"
                onPress={handleShowTutorial}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressedButton]}
              >
                <Text style={styles.secondaryButtonText}>チュートリアルをもう一度見る</Text>
              </Pressable>
            </View>

            {MANUAL_SECTIONS.map((section) => (
              <View key={section.id} className="bg-surface rounded-lg border border-border overflow-hidden">
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expandedId === section.id }}
                  onPress={() => toggleSection(section.id)}
                  style={({ pressed }) => [styles.sectionButton, pressed && styles.sectionPressed]}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <Text className="text-2xl">{section.icon}</Text>
                      <Text className="text-lg font-semibold text-foreground flex-1">{section.title}</Text>
                    </View>
                    <Text className="text-xl text-muted">{expandedId === section.id ? "−" : "+"}</Text>
                  </View>
                </Pressable>

                {expandedId === section.id && (
                  <View className="border-t border-border px-4 py-4 gap-3">
                    {section.content.map((text, index) => (
                      <Text key={`content-${index}`} className="text-sm text-muted leading-relaxed">
                        {text}
                      </Text>
                    ))}
                    <View className="mt-2 gap-2 bg-background rounded-lg p-3">
                      {section.steps.map((step, index) => (
                        <Text key={`step-${index}`} className="text-sm text-foreground leading-relaxed">
                          {index + 1}. {step}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}

            <View className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Text className="text-sm text-blue-900 font-semibold mb-2">さらにサポートが必要な場合</Text>
              <Text className="text-xs text-blue-800 leading-relaxed">
                エラー画面に表示された成功件数・失敗件数・失敗理由を控えて、アプリの管理者へお知らせください。
              </Text>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>

      <Modal
        animationType="fade"
        transparent
        visible={showTutorial}
        statusBarTranslucent
        onRequestClose={() => setShowTutorial(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View className="flex-row justify-center gap-2">
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={index === currentStep ? styles.activeDot : styles.inactiveDot}
                />
              ))}
            </View>
            <Text className="text-5xl text-center mt-4">{tutorialStep.icon}</Text>
            <Text className="text-2xl font-bold text-foreground text-center mt-3">
              {tutorialStep.title}
            </Text>
            <Text className="text-base text-muted text-center leading-relaxed mt-3">
              {tutorialStep.description}
            </Text>
            <View className="flex-row gap-3 mt-6">
              {currentStep > 0 && (
                <Pressable
                  onPress={handlePrevStep}
                  style={({ pressed }) => [styles.modalSecondaryButton, pressed && styles.pressedButton]}
                >
                  <Text style={styles.secondaryButtonText}>戻る</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleNextStep}
                style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.pressedButton]}
              >
                <Text style={styles.primaryButtonText}>
                  {currentStep === tutorialSteps.length - 1 ? "完了" : "次へ"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.55,
  },
  pressedButton: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  sectionButton: {
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionPressed: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  activeDot: {
    width: 30,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  inactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  modalPrimaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
