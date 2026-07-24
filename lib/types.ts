/**
 * 部品在庫管理アプリ - 型定義
 */

/**
 * 部品マスタ
 */
export interface Part {
  id: string; // UUID
  name: string; // 部品名
  partNumber: string; // 品番
  unitPrice: number; // 単価（円）
  currentStock: number; // 現在在庫数
  minStock: number; // 最低在庫数
  allowDecimal: boolean; // 小数使用フラグ
  supplier?: string; // 仕入れ先（オプション）
  createdAt: string; // 作成日時（ISO 8601）
  updatedAt: string; // 更新日時（ISO 8601）
}

/**
 * 出庫履歴
 */
export interface OutboundRecord {
  id: string; // UUID
  date: string; // 日付（YYYY-MM-DD）
  voucherNumber: string; // 伝票番号
  customerName: string; // 顧客名
  vehicleNumber: string; // 車両ナンバー（下4桁）
  partId: string; // 部品ID
  partName: string; // 部品名（スナップショット）
  quantity: number; // 数量
  createdAt: string; // 作成日時（ISO 8601）
}

/**
 * 入庫履歴
 */
export interface InboundRecord {
  id: string; // UUID
  date: string; // 日付（YYYY-MM-DD）
  voucherNumber: string; // 伝票番号
  supplier: string; // 仕入先
  partId: string; // 部品ID
  partName: string; // 部品名（スナップショット）
  quantity: number; // 数量
  createdAt: string; // 作成日時（ISO 8601）
}

/**
 * 顧客マスタ
 */
export interface Customer {
  id: string; // UUID
  vehicleNumber: string; // 車両ナンバー（下4桁）
  name: string; // 顧客名
  createdAt: string; // 作成日時（ISO 8601）
  updatedAt: string; // 更新日時（ISO 8601）
}

/**
 * 月末在庫スナップショット
 */
export interface MonthlyInventorySnapshot {
  id: string; // UUID
  month: string; // 月（YYYY-MM）
  partId: string; // 部品ID
  partName: string; // 部品名
  closingStock: number; // 月末在庫数
  createdAt: string; // 作成日時（ISO 8601）
}

/**
 * 在庫状態
 */
export enum InventoryStatus {
  NORMAL = "normal", // 適正
  LOW = "low", // 不足（最低在庫以下）
  NEGATIVE = "negative", // マイナス在庫
}

/**
 * 在庫アイテム（表示用）
 */
export interface InventoryItem {
  part: Part;
  status: InventoryStatus;
  isLow: boolean; // 最低在庫以下か
  isNegative: boolean; // マイナス在庫か
}

/**
 * 部品選択用（よく使う部品）
 */
export interface FrequentPart {
  part: Part;
  usageCount: number; // 使用回数
}

/**
 * 車両履歴用
 */
export interface VehicleHistory {
  vehicleNumber: string; // 車両ナンバー（下4桁）
  customerName: string; // 顧客名
  recentParts: Part[]; // 最近使用した部品（最大5件）
}
