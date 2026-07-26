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
export async function exportOutboundRecordsAsCSV(startDate?: Date, endDate?: Date): Promise<string> {
  try {
    const records = await getOutboundRecords();
    
    // 期間フィルタリング
    let filteredRecords = records;
    if (startDate && endDate) {
      // ローカルタイムで日付を取得（タイムゾーン対応）
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const start = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const end = `${endYear}-${endMonth}-${endDay}`;
      
      filteredRecords = records.filter(r => r.date >= start && r.date <= end);
    }
    
    const header = "日付,伝票番号,顧客名,ナンバー,部品名,数量\n";
    const rows = filteredRecords
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
export async function exportInboundRecordsAsCSV(startDate?: Date, endDate?: Date): Promise<string> {
  try {
    const records = await getInboundRecords();
    
    // 期間フィルタリング
    let filteredRecords = records;
    if (startDate && endDate) {
      // ローカルタイムで日付を取得（タイムゾーン対応）
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const start = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const end = `${endYear}-${endMonth}-${endDay}`;
      
      filteredRecords = records.filter(r => r.date >= start && r.date <= end);
    }
    
    const header = "日付,伝票番号,仕入先,部品名,数量\n";
    const rows = filteredRecords
      .map((r) => `${r.date},${r.voucherNumber},${r.supplier},${r.partName},${r.quantity}`)
      .join("\n");
    return header + rows;
  } catch (error) {
    console.error("Error exporting inbound records:", error);
    throw error;
  }
}


/**
 * 月別集計：出庫数・入庫数・在庫金額を集計
 */
export async function getMonthlyInventorySummary(month: string, startDate?: Date, endDate?: Date): Promise<string> {
  try {
    const parts = await getParts();
    const outboundRecords = await getOutboundRecords();
    const inboundRecords = await getInboundRecords();

    // 期間フィルタリング
    let monthOutbound = outboundRecords;
    let monthInbound = inboundRecords;
    
    if (startDate && endDate) {
      // ローカルタイムで日付を取得（タイムゾーン対応）
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const start = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const end = `${endYear}-${endMonth}-${endDay}`;
      
      monthOutbound = monthOutbound.filter(r => r.date >= start && r.date <= end);
      monthInbound = monthInbound.filter(r => r.date >= start && r.date <= end);
    } else {
      // 期間指定がない場合は当月のみ
      monthOutbound = monthOutbound.filter((r) => r.date.startsWith(month));
      monthInbound = monthInbound.filter((r) => r.date.startsWith(month));
    }

    // 部品ごとに集計
    const summary = parts.map((part) => {
      const outboundQty = monthOutbound
        .filter((r) => r.partId === part.id)
        .reduce((sum, r) => sum + r.quantity, 0);

      const inboundQty = monthInbound
        .filter((r) => r.partId === part.id)
        .reduce((sum, r) => sum + r.quantity, 0);

      const inventoryValue = part.currentStock * part.unitPrice;

      return {
        partName: part.name,
        partNumber: part.partNumber,
        unitPrice: part.unitPrice,
        outboundQty,
        inboundQty,
        currentStock: part.currentStock,
        inventoryValue,
      };
    });

    // CSV形式で出力
    const header = "部品名,品番,単価,出庫数,入庫数,現在庫数,在庫金額\n";
    const rows = summary
      .map(
        (s) =>
          `${s.partName},${s.partNumber},${s.unitPrice},${s.outboundQty},${s.inboundQty},${s.currentStock},${s.inventoryValue}`
      )
      .join("\n");

    // 合計行を追加
    const totalOutbound = summary.reduce((sum, s) => sum + s.outboundQty, 0);
    const totalInbound = summary.reduce((sum, s) => sum + s.inboundQty, 0);
    const totalInventoryValue = summary.reduce((sum, s) => sum + s.inventoryValue, 0);
    const totalRow = `合計,,,${totalOutbound},${totalInbound},,${totalInventoryValue}`;

    return header + rows + "\n" + totalRow;
  } catch (error) {
    console.error("Error generating monthly inventory summary:", error);
    throw error;
  }
}


/**
 * CSV からバッチ部品追加
 * CSV形式: 部品名,品番,単価,最低在庫数,小数対応,現在庫（現在庫は省略可能）
 */
export async function importPartsFromCSV(csvContent: string): Promise<{ success: number; failed: number; errors: string[]; duplicates: Array<{ row: number; name: string; partNumber: string; supplier: string }> }> {
  try {
    const lines = csvContent.trim().split('\n');
    const parts = await getParts();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const duplicates: Array<{ row: number; name: string; partNumber: string; supplier: string }> = [];

    // ヘッダーをスキップ
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const columns = line.split(',').map(v => v.trim());
        
        // 最低5列必須（現在庫列は省略可能、仕入先列は省略可能）
        if (columns.length < 5) {
          errors.push(`行${i + 1}: 列の数が不足しています（最低5列必須）`);
          failed++;
          continue;
        }

        const [name, partNumber, unitPriceStr, minStockStr, allowDecimalStr, currentStockStr, supplierStr] = columns;

        if (!name || !partNumber) {
          errors.push(`行${i + 1}: 部品名と品番は必須です`);
          failed++;
          continue;
        }

        const unitPrice = parseFloat(unitPriceStr) || 0;
        const minStock = parseFloat(minStockStr) || 0;
        const allowDecimal = allowDecimalStr?.toLowerCase() === 'true' || allowDecimalStr === '○';
        const currentStock = currentStockStr ? parseFloat(currentStockStr) : 0;
        const supplier = supplierStr || '';

        // 重複チェック（部品名、品番、仕入先が同一）
        const duplicateIndex = parts.findIndex(
          p => p.name === name && p.partNumber === partNumber && (p.supplier || '') === supplier
        );

        if (duplicateIndex !== -1) {
          // 重複情報を記録
          duplicates.push({
            row: i + 1,
            name,
            partNumber,
            supplier
          });
          continue; // ここではスキップ、後でユーザーの選択を待つ
        }

        const newPart: Part = {
          id: generateId(),
          name,
          partNumber,
          unitPrice,
          currentStock,
          minStock,
          allowDecimal,
          supplier,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        parts.push(newPart);
        success++;
      } catch (error) {
        errors.push(`行${i + 1}: パース エラー - ${String(error)}`);
        failed++;
      }
    }

    // すべての部品を保存
    await AsyncStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(parts));

    return { success, failed, errors, duplicates };
  } catch (error) {
    console.error("Error importing parts from CSV:", error);
    throw error;
  }
}

/**
 * 全データをバックアップ（JSON形式）
 */
export async function exportAllDataAsJSON(): Promise<string> {
  try {
    const parts = await getParts();
    const outboundRecords = await getOutboundRecords();
    const inboundRecords = await getInboundRecords();
    const customers = await getCustomers();
    const monthlySnapshots = await getMonthlySnapshots();

    const backupData = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      parts,
      outboundRecords,
      inboundRecords,
      customers,
      monthlySnapshots,
    };

    return JSON.stringify(backupData, null, 2);
  } catch (error) {
    console.error("Error exporting all data:", error);
    throw error;
  }
}

/**
 * バックアップから全データを復元
 */
export async function importAllDataFromJSON(jsonContent: string): Promise<{ success: boolean; message: string }> {
  try {
    const backupData = JSON.parse(jsonContent);

    if (!backupData.version) {
      throw new Error("無効なバックアップファイル形式です");
    }

    // 既存データをクリア
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.PARTS, JSON.stringify(backupData.parts || [])],
      [STORAGE_KEYS.OUTBOUND_RECORDS, JSON.stringify(backupData.outboundRecords || [])],
      [STORAGE_KEYS.INBOUND_RECORDS, JSON.stringify(backupData.inboundRecords || [])],
      [STORAGE_KEYS.CUSTOMERS, JSON.stringify(backupData.customers || [])],
      [STORAGE_KEYS.MONTHLY_SNAPSHOTS, JSON.stringify(backupData.monthlySnapshots || [])],
    ]);

    return {
      success: true,
      message: `復元完了: 部品${backupData.parts?.length || 0}件、出庫${backupData.outboundRecords?.length || 0}件、入庫${backupData.inboundRecords?.length || 0}件`,
    };
  } catch (error) {
    console.error("Error importing all data:", error);
    return {
      success: false,
      message: `復元失敗: ${String(error)}`,
    };
  }
}

/**
 * 出庫記録を削除（IDで指定）
 */
export async function deleteOutboundRecord(recordId: string): Promise<void> {
  try {
    const records = await getOutboundRecords();
    const filtered = records.filter((r) => r.id !== recordId);
    await AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_RECORDS, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting outbound record:", error);
    throw error;
  }
}

/**
 * 複数の出庫記録を削除
 */
export async function deleteOutboundRecords(recordIds: string[]): Promise<void> {
  try {
    const records = await getOutboundRecords();
    const filtered = records.filter((r) => !recordIds.includes(r.id));
    await AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_RECORDS, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting outbound records:", error);
    throw error;
  }
}

/**
 * 伝票番号検索：出庫履歴から最新の1件を取得
 */
export async function getOutboundRecordByVoucherNumber(voucherNumber: string): Promise<OutboundRecord | null> {
  try {
    const records = await getOutboundRecords();
    // 伝票番号が同じ最新の記録を取得
    const matchingRecords = records
      .filter((r) => r.voucherNumber === voucherNumber)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return matchingRecords.length > 0 ? matchingRecords[0] : null;
  } catch (error) {
    console.error("Error getting outbound record by voucher number:", error);
    return null;
  }
}


/**
 * 部品リストCSVテンプレートを生成
 * テンプレート形式: 部品名,品番,単価,最低在庫数,小数対応
 */
export async function generatePartsCSVTemplate(): Promise<string> {
  try {
    // 現在の部品一覧を取得
    const parts = await getParts();
    
    // ヘッダー行（現在庫列を追加）
    const header = "部品名,品番,単価,最低在庫数,小数対応,現在庫,仕入れ先\n";
    
    // 既存部品のデータ行
    const dataRows = parts.map(part => {
      const currentStock = part.allowDecimal 
        ? Math.round(part.currentStock * 10) / 10 
        : Math.round(part.currentStock);
      const smallDecimal = part.allowDecimal ? "○" : "×";
      const supplier = part.supplier || "";
      return `${part.name},${part.partNumber},${part.unitPrice},${part.minStock},${smallDecimal},${currentStock},${supplier}`;
    });
    
    // サンプル行（参考用）
    const exampleRows = [
      "エンジンオイル,EO-001,5000,10,○,25,日本知貫気象店",
      "エアフィルター,AF-001,2000,5,×,8,トヨタ部品店",
      "バッテリー,BAT-001,15000,2,×,3,パナソニック店",
    ];
    
    // 既存部品がある場合はそれを使用、ない場合はサンプルを使用
    const rows = dataRows.length > 0 ? dataRows : exampleRows;
    return header + rows.join("\n");
  } catch (error) {
    console.error("Error generating parts CSV template:", error);
    throw error;
  }
}


/**
 * 出庫履歴テンプレートCSV生成
 */
export async function generateOutboundRecordsCSVTemplate(): Promise<string> {
  try {
    // ヘッダー行
    const header = "日付,伝票番号,顧客名,車両ナンバー,部品名,数量\n";
    
    // 最近の出庫履歴を取得（最大5件）
    const records = await getOutboundRecords();
    const recentRecords = records.slice(0, 5);
    
    // 既存データ行
    const dataRows = recentRecords.map(record => {
      return `${record.date},${record.voucherNumber},${record.customerName},${record.vehicleNumber},${record.partName},${record.quantity}`;
    });
    
    // サンプル行（参考用）
    const exampleRows = [
      "2026-07-24,DEN-001,山田自動車,1234,エンジンオイル,2",
      "2026-07-24,DEN-002,太郎自動車,5678,エアフィルター,1",
      "2026-07-23,DEN-003,花子自動車,9012,バッテリー,1",
    ];
    
    // 既存データがある場合はそれを使用、ない場合はサンプルを使用
    const rows = dataRows.length > 0 ? dataRows : exampleRows;
    return header + rows.join("\n");
  } catch (error) {
    console.error("Error generating outbound records CSV template:", error);
    throw error;
  }
}

/**
 * 入庫履歴テンプレートCSV生成
 */
export async function generateInboundRecordsCSVTemplate(): Promise<string> {
  try {
    // ヘッダー行
    const header = "日付,伝票番号,仕入先,部品名,数量\n";
    
    // 最近の入庫履歴を取得（最大5件）
    const records = await getInboundRecords();
    const recentRecords = records.slice(0, 5);
    
    // 既存データ行
    const dataRows = recentRecords.map(record => {
      return `${record.date},${record.voucherNumber},${record.supplier},${record.partName},${record.quantity}`;
    });
    
    // サンプル行（参考用）
    const exampleRows = [
      "2026-07-24,NUU-001,日本知貫気象店,エンジンオイル,10",
      "2026-07-24,NUU-002,トヨタ部品店,エアフィルター,5",
      "2026-07-23,NUU-003,パナソニック店,バッテリー,3",
    ];
    
    // 既存データがある場合はそれを使用、ない場合はサンプルを使用
    const rows = dataRows.length > 0 ? dataRows : exampleRows;
    return header + rows.join("\n");
  } catch (error) {
    console.error("Error generating inbound records CSV template:", error);
    throw error;
  }
}

/**
 * 出庫履歴CSVインポート
 */
export async function importOutboundRecordsFromCSV(csvContent: string): Promise<{ success: number; failed: number }> {
  try {
    const lines = csvContent.trim().split("\n");
    
    // ヘッダーをスキップ
    const dataLines = lines.slice(1);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      try {
        const columns = line.split(",").map(col => col.trim());
        
        if (columns.length < 6) {
          failureCount++;
          continue;
        }
        
        const [date, voucherNumber, customerName, vehicleNumber, partName, quantityStr] = columns;
        const quantity = parseFloat(quantityStr);
        
        if (!date || !voucherNumber || !customerName || !vehicleNumber || !partName || isNaN(quantity)) {
          failureCount++;
          continue;
        }
        
        // 部品IDを取得（部品名から検索）
        const parts = await getParts();
        const part = parts.find(p => p.name === partName);
        
        if (!part) {
          failureCount++;
          continue;
        }
        
        // 出庫履歴を追加
        const record: OutboundRecord = {
          id: generateId(),
          date,
          voucherNumber,
          customerName,
          vehicleNumber,
          partId: part.id,
          partName,
          quantity,
          createdAt: new Date().toISOString(),
        };
        
        const records = await getOutboundRecords();
        records.push(record);
        await AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_RECORDS, JSON.stringify(records));
        
        // 在庫数を減らす
        const updatedPart = { ...part, currentStock: part.currentStock - quantity };
        await updatePart(part.id, updatedPart);
        
        successCount++;
      } catch {
        failureCount++;
      }
    }
    
    return { success: successCount, failed: failureCount };
  } catch (error) {
    console.error("Error importing outbound records from CSV:", error);
    throw error;
  }
}

/**
 * 入庫履歴CSVインポート
 */
export async function importInboundRecordsFromCSV(csvContent: string): Promise<{ success: number; failed: number }> {
  try {
    const lines = csvContent.trim().split("\n");
    
    // ヘッダーをスキップ
    const dataLines = lines.slice(1);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      try {
        const columns = line.split(",").map(col => col.trim());
        
        if (columns.length < 5) {
          failureCount++;
          continue;
        }
        
        const [date, voucherNumber, supplier, partName, quantityStr] = columns;
        const quantity = parseFloat(quantityStr);
        
        if (!date || !voucherNumber || !supplier || !partName || isNaN(quantity)) {
          failureCount++;
          continue;
        }
        
        // 部品IDを取得（部品名から検索）
        const parts = await getParts();
        const part = parts.find(p => p.name === partName);
        
        if (!part) {
          failureCount++;
          continue;
        }
        
        // 入庫履歴を追加
        const record: InboundRecord = {
          id: generateId(),
          date,
          voucherNumber,
          supplier,
          partId: part.id,
          partName,
          quantity,
          createdAt: new Date().toISOString(),
        };
        
        const records = await getInboundRecords();
        records.push(record);
        await AsyncStorage.setItem(STORAGE_KEYS.INBOUND_RECORDS, JSON.stringify(records));
        
        // 在庫数を増やす
        const updatedPart = { ...part, currentStock: part.currentStock + quantity };
        await updatePart(part.id, updatedPart);
        
        successCount++;
      } catch {
        failureCount++;
      }
    }
    
    return { success: successCount, failed: failureCount };
  } catch (error) {
    console.error("Error importing inbound records from CSV:", error);
    throw error;
  }
}


/**
 * CSVインポート時に重複部品を上書き
 */
export async function importPartsFromCSVWithOverwrite(
  csvContent: string,
  overwriteRows: number[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const lines = csvContent.trim().split('\n');
    const parts = await getParts();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    let dataRowIndex = 0;

    // ヘッダーをスキップ
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const columns = line.split(',').map(v => v.trim());
        
        if (columns.length < 5) {
          errors.push(`行${i + 1}: 列の数が不足しています（最低5列必須）`);
          failed++;
          dataRowIndex++;
          continue;
        }

        const [name, partNumber, unitPriceStr, minStockStr, allowDecimalStr, currentStockStr, supplierStr] = columns;

        if (!name || !partNumber) {
          errors.push(`行${i + 1}: 部品名と品番は必須です`);
          failed++;
          dataRowIndex++;
          continue;
        }

        const unitPrice = parseFloat(unitPriceStr) || 0;
        const minStock = parseFloat(minStockStr) || 0;
        const allowDecimal = allowDecimalStr?.toLowerCase() === 'true' || allowDecimalStr === '○';
        const currentStock = currentStockStr ? parseFloat(currentStockStr) : 0;
        const supplier = supplierStr || '';

        // 重複チェック
        const duplicateIndex = parts.findIndex(
          p => p.name === name && p.partNumber === partNumber && (p.supplier || '') === supplier
        );

        if (duplicateIndex !== -1) {
          // 上書きリストに含まれている場合のみ上書き
          if (overwriteRows.includes(dataRowIndex)) {
            parts[duplicateIndex] = {
              ...parts[duplicateIndex],
              name,
              partNumber,
              unitPrice,
              minStock,
              allowDecimal,
              currentStock,
              supplier,
              updatedAt: new Date().toISOString(),
            };
            success++;
          } else {
            errors.push(`行${i + 1}: 品番 ${partNumber} は既に存在します（スキップ）`);
            failed++;
          }
          dataRowIndex++;
          continue;
        }

        const newPart: Part = {
          id: generateId(),
          name,
          partNumber,
          unitPrice,
          currentStock,
          minStock,
          allowDecimal,
          supplier,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        parts.push(newPart);
        success++;
        dataRowIndex++;
      } catch (error) {
        errors.push(`行${i + 1}: パース エラー - ${String(error)}`);
        failed++;
        dataRowIndex++;
      }
    }

    // すべての部品を保存
    await AsyncStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(parts));

    return { success, failed, errors };
  } catch (error) {
    console.error("Error importing parts from CSV with overwrite:", error);
    throw error;
  }
}


/**
 * 既存の仕入先一覧を取得
 * 部品マスタと入庫履歴から一意の仕入先を抽出
 */
export async function getSuppliers(): Promise<string[]> {
  try {
    const suppliers = new Set<string>();

    // 部品マスタから仕入先を取得
    const partsJson = await AsyncStorage.getItem(STORAGE_KEYS.PARTS);
    if (partsJson) {
      const parts: Part[] = JSON.parse(partsJson);
      parts.forEach((part) => {
        if (part.supplier && part.supplier.trim()) {
          suppliers.add(part.supplier.trim());
        }
      });
    }

    // 入庫履歴から仕入先を取得
    const inboundJson = await AsyncStorage.getItem(
      STORAGE_KEYS.INBOUND_RECORDS
    );
    if (inboundJson) {
      const inboundRecords: InboundRecord[] = JSON.parse(inboundJson);
      inboundRecords.forEach((record) => {
        if (record.supplier && record.supplier.trim()) {
          suppliers.add(record.supplier.trim());
        }
      });
    }

    // ソートして返す
    return Array.from(suppliers).sort();
  } catch (error) {
    console.error("Error getting suppliers:", error);
    return [];
  }
}
