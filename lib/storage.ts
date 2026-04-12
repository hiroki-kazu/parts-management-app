/**
 * AsyncStorageを使用したローカルデータベース管理
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Part,
  OutboundRecord,
  InboundRecord,
  Customer,
  MonthlyInventorySnapshot,
} from "./types";

const STORAGE_KEYS = {
  PARTS: "parts",
  OUTBOUND_RECORDS: "outbound_records",
  INBOUND_RECORDS: "inbound_records",
  CUSTOMERS: "customers",
  MONTHLY_SNAPSHOTS: "monthly_snapshots",
};

/**
 * UUID生成（簡易版）
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 現在の日付を取得（YYYY-MM-DD形式）
 */
export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * 現在の月を取得（YYYY-MM形式）
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return now.toISOString().split("T")[0].slice(0, 7);
}

/**
 * 初期化：サンプルデータをロード
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // 既存データをチェック
    const existingParts = await AsyncStorage.getItem(STORAGE_KEYS.PARTS);
    if (existingParts) {
      return; // 既にデータが存在する場合はスキップ
    }

    // サンプル部品マスタをロード
    const sampleParts: Part[] = [
      {
        id: generateId(),
        name: "エンジンオイル",
        partNumber: "EO-001",
        unitPrice: 2500,
        currentStock: 15,
        minStock: 5,
        allowDecimal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "ブレーキパッド",
        partNumber: "BP-002",
        unitPrice: 3800,
        currentStock: 2,
        minStock: 5,
        allowDecimal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "ラジエーター液",
        partNumber: "RL-003",
        unitPrice: 1200,
        currentStock: 8,
        minStock: 3,
        allowDecimal: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "エアフィルター",
        partNumber: "AF-004",
        unitPrice: 1500,
        currentStock: 20,
        minStock: 10,
        allowDecimal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "バッテリー",
        partNumber: "BAT-005",
        unitPrice: 8500,
        currentStock: 5,
        minStock: 2,
        allowDecimal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "ワイパーブレード",
        partNumber: "WB-006",
        unitPrice: 2200,
        currentStock: 12,
        minStock: 5,
        allowDecimal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "スパークプラグ",
        partNumber: "SP-007",
        unitPrice: 800,
        currentStock: 30,
        minStock: 10,
        allowDecimal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "ベルト",
        partNumber: "BLT-008",
        unitPrice: 3500,
        currentStock: 4,
        minStock: 2,
        allowDecimal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(sampleParts));
    await AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_RECORDS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.INBOUND_RECORDS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.MONTHLY_SNAPSHOTS, JSON.stringify([]));
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

/**
 * 部品マスタ取得
 */
export async function getParts(): Promise<Part[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PARTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting parts:", error);
    return [];
  }
}

/**
 * 部品追加
 */
export async function addPart(part: Omit<Part, "id" | "createdAt" | "updatedAt">): Promise<Part> {
  try {
    const parts = await getParts();
    const newPart: Part = {
      ...part,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    parts.push(newPart);
    await AsyncStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(parts));
    return newPart;
  } catch (error) {
    console.error("Error adding part:", error);
    throw error;
  }
}

/**
 * 部品更新
 */
export async function updatePart(id: string, updates: Partial<Part>): Promise<Part | null> {
  try {
    const parts = await getParts();
    const index = parts.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updatedPart: Part = {
      ...parts[index],
      ...updates,
      id: parts[index].id,
      createdAt: parts[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    parts[index] = updatedPart;
    await AsyncStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(parts));
    return updatedPart;
  } catch (error) {
    console.error("Error updating part:", error);
    throw error;
  }
}

/**
 * 部品削除
 */
export async function deletePart(id: string): Promise<boolean> {
  try {
    const parts = await getParts();
    const filtered = parts.filter((p) => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error deleting part:", error);
    throw error;
  }
}

/**
 * 出庫履歴追加
 */
export async function addOutboundRecord(
  record: Omit<OutboundRecord, "id" | "createdAt">
): Promise<OutboundRecord> {
  try {
    const records = await getOutboundRecords();
    const newRecord: OutboundRecord = {
      ...record,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    records.push(newRecord);
    await AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_RECORDS, JSON.stringify(records));

    // 在庫を減算
    const part = await getPart(record.partId);
    if (part) {
      await updatePart(part.id, {
        currentStock: part.currentStock - record.quantity,
      });
    }

    // 顧客情報を記録
    await addOrUpdateCustomer({
      vehicleNumber: record.vehicleNumber,
      name: record.customerName,
    });

    return newRecord;
  } catch (error) {
    console.error("Error adding outbound record:", error);
    throw error;
  }
}

/**
 * 出庫履歴取得
 */
export async function getOutboundRecords(): Promise<OutboundRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.OUTBOUND_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting outbound records:", error);
    return [];
  }
}

/**
 * 入庫履歴追加
 */
export async function addInboundRecord(
  record: Omit<InboundRecord, "id" | "createdAt">
): Promise<InboundRecord> {
  try {
    const records = await getInboundRecords();
    const newRecord: InboundRecord = {
      ...record,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    records.push(newRecord);
    await AsyncStorage.setItem(STORAGE_KEYS.INBOUND_RECORDS, JSON.stringify(records));

    // 在庫を加算
    const part = await getPart(record.partId);
    if (part) {
      await updatePart(part.id, {
        currentStock: part.currentStock + record.quantity,
      });
    }

    return newRecord;
  } catch (error) {
    console.error("Error adding inbound record:", error);
    throw error;
  }
}

/**
 * 入庫履歴取得
 */
export async function getInboundRecords(): Promise<InboundRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.INBOUND_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting inbound records:", error);
    return [];
  }
}

/**
 * 顧客追加・更新
 */
export async function addOrUpdateCustomer(customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer> {
  try {
    const customers = await getCustomers();
    const existingIndex = customers.findIndex(
      (c) => c.vehicleNumber === customer.vehicleNumber
    );

    if (existingIndex !== -1) {
      // 既存顧客を更新
      const updated: Customer = {
        ...customers[existingIndex],
        ...customer,
        updatedAt: new Date().toISOString(),
      };
      customers[existingIndex] = updated;
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      return updated;
    } else {
      // 新規顧客を追加
      const newCustomer: Customer = {
        ...customer,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customers.push(newCustomer);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      return newCustomer;
    }
  } catch (error) {
    console.error("Error adding/updating customer:", error);
    throw error;
  }
}

/**
 * 顧客取得
 */
export async function getCustomers(): Promise<Customer[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting customers:", error);
    return [];
  }
}

/**
 * 顧客名取得（ナンバーから）
 */
export async function getCustomerByVehicleNumber(vehicleNumber: string): Promise<Customer | null> {
  try {
    const customers = await getCustomers();
    return customers.find((c) => c.vehicleNumber === vehicleNumber) || null;
  } catch (error) {
    console.error("Error getting customer:", error);
    return null;
  }
}

/**
 * 部品取得（IDから）
 */
export async function getPart(id: string): Promise<Part | null> {
  try {
    const parts = await getParts();
    return parts.find((p) => p.id === id) || null;
  } catch (error) {
    console.error("Error getting part:", error);
    return null;
  }
}

/**
 * よく使う部品を取得（使用回数上位5件）
 */
export async function getFrequentParts(limit: number = 5): Promise<Part[]> {
  try {
    const records = await getOutboundRecords();
    const partUsageMap = new Map<string, number>();

    records.forEach((record) => {
      const count = partUsageMap.get(record.partId) || 0;
      partUsageMap.set(record.partId, count + 1);
    });

    const parts = await getParts();
    const frequentParts = parts
      .map((part) => ({
        part,
        usageCount: partUsageMap.get(part.id) || 0,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
      .map((item) => item.part);

    return frequentParts;
  } catch (error) {
    console.error("Error getting frequent parts:", error);
    return [];
  }
}

/**
 * 車両の使用履歴から部品を取得
 */
export async function getPartsByVehicleNumber(
  vehicleNumber: string,
  limit: number = 5
): Promise<Part[]> {
  try {
    const records = await getOutboundRecords();
    const vehicleRecords = records
      .filter((r) => r.vehicleNumber === vehicleNumber)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    const parts = await getParts();
    const partIds = new Set(vehicleRecords.map((r) => r.partId));
    return parts.filter((p) => partIds.has(p.id));
  } catch (error) {
    console.error("Error getting parts by vehicle number:", error);
    return [];
  }
}

/**
 * ナンバー検索：出庫履歴を取得
 */
export async function getOutboundRecordsByVehicleNumber(vehicleNumber: string): Promise<OutboundRecord[]> {
  try {
    const records = await getOutboundRecords();
    return records
      .filter((r) => r.vehicleNumber === vehicleNumber)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error getting outbound records by vehicle number:", error);
    return [];
  }
}

/**
 * 月末スナップショット保存
 */
export async function saveMonthlySnapshot(month: string): Promise<void> {
  try {
    const parts = await getParts();
    const snapshots = await getMonthlySnapshots();

    const newSnapshots: MonthlyInventorySnapshot[] = parts.map((part) => ({
      id: generateId(),
      month,
      partId: part.id,
      partName: part.name,
      closingStock: part.currentStock,
      createdAt: new Date().toISOString(),
    }));

    const filtered = snapshots.filter((s) => s.month !== month);
    const updated = [...filtered, ...newSnapshots];
    await AsyncStorage.setItem(STORAGE_KEYS.MONTHLY_SNAPSHOTS, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving monthly snapshot:", error);
    throw error;
  }
}

/**
 * 月末スナップショット取得
 */
export async function getMonthlySnapshots(): Promise<MonthlyInventorySnapshot[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MONTHLY_SNAPSHOTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting monthly snapshots:", error);
    return [];
  }
}

/**
 * CSV出力用：出庫履歴
 */
export async function exportOutboundRecordsAsCSV(): Promise<string> {
  try {
    const records = await getOutboundRecords();
    const header = "日付,伝票番号,顧客名,ナンバー,部品名,数量\n";
    const rows = records
      .map(
        (r) =>
          `${r.date},${r.voucherNumber},${r.customerName},${r.vehicleNumber},${r.partName},${r.quantity}`
      )
      .join("\n");
    return header + rows;
  } catch (error) {
    console.error("Error exporting outbound records:", error);
    throw error;
  }
}

/**
 * CSV出力用：入庫履歴
 */
export async function exportInboundRecordsAsCSV(): Promise<string> {
  try {
    const records = await getInboundRecords();
    const header = "日付,伝票番号,仕入先,部品名,数量\n";
    const rows = records
      .map((r) => `${r.date},${r.voucherNumber},${r.supplier},${r.partName},${r.quantity}`)
      .join("\n");
    return header + rows;
  } catch (error) {
    console.error("Error exporting inbound records:", error);
    throw error;
  }
}
