/**
 * TOP画面（ホーム）
 * 5つのメインメニューボタンを使用頻度順に配置
 */

import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

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
    title: "月末処理",
    subtitle: "確定・繰越・CSV出力",
    route: "/monthend",
    color: "bg-red-500",
    icon: "📅",
  },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleMenuPress = async (route: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(route as any);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  return (
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
          <View className="mt-auto pt-4 items-center">
            <Text className="text-xs text-muted">タップして操作を開始</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
