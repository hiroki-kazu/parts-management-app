import { ScrollView, Text, View, Pressable, Modal, Alert } from "react-native";
import { useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { getTutorialShown, setTutorialShown } from "@/lib/storage";

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: string[];
  steps?: string[];
}

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
}

const helpSections: HelpSection[] = [
  {
    id: "outbound",
    title: "部品を使った（出庫入力）",
    icon: "📤",
    content: [
      "部品を使用した時の出庫入力方法です。",
      "現場で部品を使用した際に、その情報をアプリに記録します。",
    ],
    steps: [
      "1. ホーム画面の「部品を使った」カードをタップ",
      "2. 部品番号を入力（テンキーで入力可能）",
      "3. 使用数量を入力",
      "4. 用途/メモ欄に使用目的を記入（オプション）",
      "5. 「記録する」ボタンをタップして完了",
      "💡 ヒント：複数の部品を連続入力する場合、入力後に自動的に次の入力欄にフォーカスします。",
    ],
  },
  {
    id: "inbound",
    title: "部品を仕入れた（入庫入力）",
    icon: "📥",
    content: [
      "新しい部品を仕入れた時の入庫入力方法です。",
      "部品の購入・納入時に、その情報をアプリに記録します。",
    ],
    steps: [
      "1. ホーム画面の「部品を仕入れた」カードをタップ",
      "2. 部品番号を入力",
      "3. 仕入数量を入力",
      "4. 仕入先/メモ欄に仕入元を記入（オプション）",
      "5. 「記録する」ボタンをタップして完了",
      "💡 ヒント：大量の部品を入庫する場合は、データ処理でCSVファイルをインポートすることで一括登録できます。",
    ],
  },
  {
    id: "inventory",
    title: "在庫を確認",
    icon: "📦",
    content: [
      "現在の在庫状況を確認する方法です。",
      "各部品の現在の在庫数を一覧で表示します。",
      "この画面は在庫状況の確認専用です。在庫の編集は出庫入力・入庫入力画面から行います。",
    ],
    steps: [
      "1. ホーム画面の「在庫を確認」カードをタップ",
      "2. 統計情報（適正・発注推奨・警告）が上部に表示されます",
      "3. 各部品の情報が表示されます：",
      "   - 部品名（アイコン付き）",
      "   - 品番",
      "   - 仕入先（登録されている場合）",
      "   - 単価",
      "   - 現在在庫",
      "   - 最低在庫",
      "   - ステータス",
      "4. 在庫が最低在庫以下の場合は⚠️マークが表示されます",
      "5. マイナス在庫の場合は🚨マークが表示されます",
      "💡 ヒント：統計情報で全体の在庫状況を一目で把握できます。",
    ],
  },
  {
    id: "history",
    title: "履歴を見る",
    icon: "🔍",
    content: [
      "出入庫の履歴を検索・確認する方法です。",
      "過去の取引記録を日付やキーワードで検索できます。",
    ],
    steps: [
      "1. ホーム画面の「履歴を見る」カードをタップ",
      "2. 検索条件を入力：",
      "   - 部品番号：部品の番号で検索",
      "   - 日付範囲：開始日と終了日を指定",
      "3. 「検索」ボタンをタップ",
      "4. 検索結果が表示されます",
      "5. 各レコードの「編集」ボタンをタップして日付や数量を修正可能",
      "💡 ヒント：日付をタップすると、カレンダーから日付を選択できます。",
    ],
  },
  {
    id: "monthend",
    title: "データ処理",
    icon: "📊",
    content: [
      "部品マスタの管理とデータのエクスポート・インポートを行う機能です。",
      "部品リストのテンプレート作成・インポート、期間指定でのデータエクスポートが可能です。",
    ],
    steps: [
      "【部品リストCSV】",
      "1. ホーム画面の『データ処理』カードをタップ",
      "2. 『テンプレートを送信』ボタンをタップ",
      "3. メールアプリが起動し、テンプレートCSVが添付されます",
      "4. テンプレートをダウンロードして編集",
      "5. 編集したCSVを『CSVを選択してインポート』でアップロード",
      "",
      "【出庫履歴CSV】",
      "1. 『出庫履歴テンプレート』セクションで『テンプレートをメール送信』をタップ",
      "2. テンプレートをダウンロードして編集",
      "3. 『CSVを選択してインポート』でアップロード",
      "4. インポート結果が表示されます",
      "",
      "【入庫履歴CSV】",
      "1. 『入庫履歴テンプレート』セクションで『テンプレートをメール送信』をタップ",
      "2. テンプレートをダウンロードして編集",
      "3. 『CSVを選択してインポート』でアップロード",
      "4. インポート結果が表示されます",
      "",
      "【期間指定エクスポート】",
      "1. 開始日と終了日を指定",
      "2. 『ZIP形式でダウンロード』ボタンをタップ",
      "3. 出庫履歴、入庫履歴、在庫サマリーがZIP形式で圧縮されます",
      "4. メールアプリが起動し、ZIPファイルが添付されます",
      "5. メールに添付されたファイルを送信または保存",
      "💡 ヒント：テンプレートには現在の部品情報と在庫数が含まれています。",
      "💡 ヒント：CSVインポート時に部品名が一致しない場合は失敗となります。",
    ],
  },
  {
    id: "faq",
    title: "よくある質問（FAQ）",
    icon: "❓",
    content: [
      "ユーザーからよくある質問と回答です。",
    ],
    steps: [
      "Q: 誤った入力を削除したい場合は？",
      "A: 履歴を見る画面で該当レコードを検索し、削除ボタンをタップしてください。",
      "",
      "Q: 部品の詳細情報を確認したい場合は？",
      "A: 在庫を確認画面で部品をタップすると、詳細情報と入出庫履歴が表示されます。",
      "",
      "Q: データをバックアップしたい場合は？",
      "A: データ処理でZIP形式でエクスポートし、クラウドストレージに保存してください。",
      "",
      "Q: 複数のデバイスでデータを同期したい場合は？",
      "A: 現在、ローカルストレージのみ対応しています。クラウド同期機能は今後の更新予定です。",
      "",
      "Q: 部品の在庫数がマイナスになった場合は？",
      "A: 入庫数より出庫数が多い場合に発生します。入庫記録を確認し、必要に応じて修正してください。",
      "",
      "Q: よく使う部品を登録したい場合は？",
      "A: 出庫入力・入庫入力画面で『よく使う部品』セクションの『編集』ボタンをタップして登録できます。",
    ],
  },
];

const tutorialSteps: TutorialStep[] = [
  {
    title: "📱 部品在庫管理へようこそ",
    description: "このアプリは、現場での部品の出入庫管理と在庫確認を効率的に行うためのツールです。",
    icon: "📦",
  },
  {
    title: "📤 部品を使った（出庫）",
    description: "部品を使用した時は『部品を使った』から入力します。部品番号と使用数量を記録できます。",
    icon: "📤",
  },
  {
    title: "📥 部品を仕入れた（入庫）",
    description: "新しい部品を仕入れた時は『部品を仕入れた』から入力します。部品番号と仕入数量を記録できます。",
    icon: "📥",
  },
  {
    title: "📦 在庫を確認",
    description: "『在庫を確認』では、全部品の現在の在庫状況を一覧で確認できます。統計情報で全体の状況も把握できます。",
    icon: "📦",
  },
  {
    title: "🔍 履歴を見る",
    description: "『履歴を見る』では、過去の出入庫記録を検索・確認できます。日付や部品番号で検索可能です。",
    icon: "🔍",
  },
  {
    title: "📊 データ処理",
    description: "『データ処理』では、部品マスタの一括管理やデータのバックアップができます。",
    icon: "📊",
  },
];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const checkTutorial = async () => {
      const shown = await getTutorialShown();
      if (!shown) {
        setShowTutorial(true);
        await setTutorialShown(true);
      }
    };
    checkTutorial();
  }, []);

  const toggleSection = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];

  return (
    <>
      {/* チュートリアルモーダル */}
      {showTutorial && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center p-4 z-50">
          <View className="bg-white rounded-2xl p-6 max-w-sm w-full gap-4">
            {/* ステップインジケーター */}
            <View className="flex-row justify-center gap-2">
              {tutorialSteps.map((_, idx) => (
                <View
                  key={idx}
                  className={`h-2 rounded-full ${
                    idx === currentStep ? "bg-primary w-8" : "bg-border w-2"
                  }`}
                />
              ))}
            </View>

            {/* アイコン */}
            <View className="items-center">
              <Text className="text-5xl">{step.icon}</Text>
            </View>

            {/* タイトル */}
            <Text className="text-2xl font-bold text-foreground text-center">
              {step.title}
            </Text>

            {/* 説明 */}
            <Text className="text-base text-muted text-center leading-relaxed">
              {step.description}
            </Text>

            {/* ボタン */}
            <View className="flex-row gap-3 mt-4">
              {currentStep > 0 && (
                <Pressable
                  onPress={handlePrevStep}
                  style={({ pressed }) => [{
                    opacity: pressed ? 0.7 : 1,
                  }]}
                  className="flex-1 py-3 px-4 bg-border rounded-lg items-center"
                >
                  <Text className="text-foreground font-semibold">戻る</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleNextStep}
                style={({ pressed }) => [{
                  opacity: pressed ? 0.7 : 1,
                }]}
                className="flex-1 py-3 px-4 bg-primary rounded-lg items-center"
              >
                <Text className="text-white font-semibold">
                  {currentStep === tutorialSteps.length - 1 ? "完了" : "次へ"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View className="gap-4">
          {/* Header */}
          <View className="mb-4">
            <Text className="text-3xl font-bold text-foreground">ヘルプ</Text>
            <Text className="text-sm text-muted mt-2">
              アプリの使い方について、よくある質問と操作方法を紹介しています。
            </Text>
          </View>

          {/* Help Sections */}
          {helpSections.map((section) => (
            <View
              key={section.id}
              className="bg-surface rounded-lg border border-border overflow-hidden"
            >
              <Pressable
                onPress={() => toggleSection(section.id)}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? "rgba(0,0,0,0.05)" : "transparent",
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                  },
                ]}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Text className="text-2xl">{section.icon}</Text>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-foreground">
                        {section.title}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xl text-muted">
                    {expandedId === section.id ? "−" : "+"}
                  </Text>
                </View>
              </Pressable>

              {/* Expanded Content */}
              {expandedId === section.id && (
                <View className="border-t border-border px-4 py-4 gap-3">
                  {/* Description */}
                  {section.content.map((text, idx) => (
                    <Text key={`desc-${idx}`} className="text-sm text-muted leading-relaxed">
                      {text}
                    </Text>
                  ))}

                  {/* Steps */}
                  {section.steps && section.steps.length > 0 && (
                    <View className="mt-3 gap-2 bg-background rounded p-3">
                      {section.steps.map((step, idx) => (
                        <Text
                          key={`step-${idx}`}
                          className={`text-sm leading-relaxed ${
                            step === "" ? "h-1" : "text-foreground"
                          }`}
                        >
                          {step}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Footer */}
          <View className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Text className="text-sm text-blue-900 font-semibold mb-2">
              💡 さらにサポートが必要な場合
            </Text>
            <Text className="text-xs text-blue-800 leading-relaxed">
              問題が解決しない場合は、アプリの開発者にお問い合わせください。
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
    </>
  );
}
