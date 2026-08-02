/**
 * TOP画面（ホーム）
 * 5つのメインメニューボタンを使用頻度順に配置
 */

import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { getHelpPopupShown, setHelpPopupShown } from "@/lib/storage";

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  color: string;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "outbound",
    title: "部品を使った",
    subtitle: "（出庫入力）",
    route: "/outbound",
    color: "bg-blue-500",
    icon: "↓",
  },
  {
    id: "inbound",
    title: "部品を仕入れた",
    subtitle: "（入庫入力）",
    route: "/inbound",
    color: "bg-green-500",
    icon: "↑",
  },
  {
    id: "inventory",
    title: "在庫を確認",
    subtitle: "現在の在庫状態を確認",
    route: "/inventory",
    color: "bg-purple-500",
    icon: "📦",
  },
  {
    id: "search",
    title: "履歴を見る",
    subtitle: "（ナンバー検索）",
    route: "/search",
    color: "bg-orange-500",
    icon: "🔍",
  },
  {
    id: "monthend",
    title: "データ処理",
    subtitle: "期間指定・テンプレート・インポート",
    route: "/monthend",
    color: "bg-red-500",
    icon: "📅",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  useEffect(() => {
    const checkHelpPopup = async () => {
      const shown = await getHelpPopupShown();
      if (!shown) {
        setShowHelpPopup(true);
        await setHelpPopupShown(true);
      }
    };
    checkHelpPopup();
  }, []);

  const handleMenuPress = async (route: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(route as any);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleReadHelp = async () => {
    setShowHelpPopup(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/help" as any);
  };

  return (
    <>
      {/* ヘルプポップアップ */}
      {showHelpPopup && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center p-4 z-50">
          <View className="bg-white rounded-2xl p-6 max-w-sm w-full gap-4">
            {/* アイコン */}
            <View className="items-center">
              <Text className="text-5xl">📚</Text>
            </View>

            {/* タイトル */}
            <Text className="text-2xl font-bold text-foreground text-center">
              ようこそ！
            </Text>

            {/* 説明 */}
            <Text className="text-base text-muted text-center leading-relaxed">
              このアプリの使い方について、ヘルプセクションで詳しく説明しています。初めての方はぜひご覧ください。
            </Text>

            {/* ボタン */}
            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={() => setShowHelpPopup(false)}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                className="flex-1 py-3 px-4 bg-border rounded-lg items-center"
              >
                <Text className="text-foreground font-semibold">スキップ</Text>
              </Pressable>
              <Pressable
                onPress={handleReadHelp}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                className="flex-1 py-3 px-4 bg-primary rounded-lg items-center"
              >
                <Text className="text-white font-semibold">ヘルプを読む</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <ScreenContainer className="p-4">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 gap-4">
            {/* ヘッダー */}
            <View className="items-center gap-2 mb-4">
              <Text className="text-3xl font-bold text-foreground">部品在庫管理</Text>
              <Text className="text-sm text-muted">現場最適化アプリ</Text>
            </View>

            {/* メニューボタン */}
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleMenuPress(item.route)}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <View className={`${item.color} rounded-2xl p-6 shadow-md`}>
                  <View className="flex-row items-center gap-4">
                    <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center">
                      <Text className="text-3xl">{item.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-white">{item.title}</Text>
                      <Text className="text-sm text-white/80">{item.subtitle}</Text>
                    </View>
                    <Text className="text-2xl text-white/60">→</Text>
                  </View>
                </View>
              </Pressable>
            ))}

            {/* フッター情報 */}
            <View className="mt-auto pt-6 items-center border-t border-border">
              <Text className="text-xs text-muted mb-2">タップして操作を開始</Text>
              <Text className="text-xs text-muted">
                v{Constants.expoConfig?.version || "1.0.0"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
