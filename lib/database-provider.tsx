/**
 * データベース初期化プロバイダー
 */

import React, { useEffect, useState } from "react";
import { initializeDatabase } from "./storage";

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
        // エラーが発生しても続行（既存データがある場合）
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  // 初期化完了まで待機
  if (!isInitialized) {
    return null; // または LoadingScreen を表示
  }

  return <>{children}</>;
};
