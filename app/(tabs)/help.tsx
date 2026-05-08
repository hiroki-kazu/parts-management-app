import { ScrollView, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: string[];
  steps?: string[];
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
      "💡 ヒント：大量の部品を入庫する場合は、月末処理でJSONファイルをインポートすることで一括登録できます。",
    ],
  },
  {
    id: "inventory",
    title: "在庫を確認",
    icon: "📦",
    content: [
      "現在の在庫状況を確認する方法です。",
      "各部品の現在の在庫数を一覧で表示します。",
    ],
    steps: [
      "1. ホーム画面の「在庫を確認」カードをタップ",
      "2. 部品一覧が表示されます",
      "3. 部品名、部品番号、現在の在庫数が表示されます",
      "4. 部品をタップして詳細情報を確認（詳細画面で入出庫履歴を確認可能）",
      "5. 在庫数が赤字で表示される場合は、在庫が不足している可能性があります",
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
    title: "月末処理",
    icon: "📊",
    content: [
      "月末にデータをエクスポートし、バックアップ・分析する方法です。",
      "複数のファイル形式でデータを出力できます。",
    ],
    steps: [
      "1. ホーム画面の「月末処理」カードをタップ",
      "2. 期間を指定（開始日と終了日）",
      "3. 以下のいずれかの形式を選択：",
      "   - CSV形式：Excelで開いて分析可能",
      "   - JSON形式：プログラムで処理可能",
      "   - ZIP形式：複数のCSVファイルを圧縮",
      "4. ボタンをタップするとメールアプリが起動",
      "5. メールに添付されたファイルを送信または保存",
      "💡 ヒント：月末処理後も履歴データは削除されません。必要に応じて手動で削除してください。",
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
      "Q: 部品マスタを編集したい場合は？",
      "A: ホーム画面の「在庫を確認」から部品をタップして、詳細画面で編集できます。",
      "",
      "Q: データをバックアップしたい場合は？",
      "A: 月末処理でJSON形式またはZIP形式でエクスポートし、クラウドストレージに保存してください。",
      "",
      "Q: 複数のデバイスでデータを同期したい場合は？",
      "A: 現在、ローカルストレージのみ対応しています。クラウド同期機能は今後の更新予定です。",
      "",
      "Q: 部品の在庫数がマイナスになった場合は？",
      "A: 入庫数より出庫数が多い場合に発生します。入庫記録を確認し、必要に応じて修正してください。",
    ],
  },
];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
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
  );
}
