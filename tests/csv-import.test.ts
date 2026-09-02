import { beforeEach, describe, expect, it, vi } from "vitest";
import Encoding from "encoding-japanese";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
  },
}));

import { decodeCSVBase64, parseCSV } from "../lib/csv";
import {
  importInboundRecordsFromCSV,
  importOutboundRecordsFromCSV,
} from "../lib/storage";

const part = {
  id: "part-1",
  name: "エンジンオイル",
  partNumber: "EO-001",
  unitPrice: 2500,
  currentStock: 10,
  minStock: 2,
  allowDecimal: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

beforeEach(() => {
  storage.clear();
  storage.set("parts", JSON.stringify([part]));
  storage.set("outbound_records", JSON.stringify([]));
  storage.set("inbound_records", JSON.stringify([]));
});

describe("CSV utilities", () => {
  it("parses quoted commas and Windows line endings", () => {
    const rows = parseCSV(
      "日付,顧客名,数量\r\n2026/09/01,\"山田自動車,本店\",2\r\n",
    );

    expect(rows).toEqual([
      ["日付", "顧客名", "数量"],
      ["2026/09/01", "山田自動車,本店", "2"],
    ]);
  });

  it("decodes a Shift-JIS CSV from base64", () => {
    const csv = "日付,部品名\n2026/09/01,エンジンオイル\n";
    const sjis = Encoding.convert(Encoding.stringToCode(csv), {
      to: "SJIS",
      from: "UNICODE",
    });
    const decoded = decodeCSVBase64(Encoding.base64Encode(sjis));

    expect(decoded.encoding).toBe("SJIS");
    expect(decoded.text).toContain("エンジンオイル");
  });

  it("detects tab-delimited CSV files", () => {
    expect(parseCSV("日付\t部品名\t数量\n2026-09-01\tEO-001\t2\n")).toEqual([
      ["日付", "部品名", "数量"],
      ["2026-09-01", "EO-001", "2"],
    ]);
  });
});

describe("history CSV imports", () => {
  it("imports outbound rows by part number and preserves quoted fields", async () => {
    const result = await importOutboundRecordsFromCSV(
      "日付,伝票番号,顧客名,ナンバー,品番,数量\r\n" +
        "2026/09/01,OUT-001,\"山田自動車,本店\",1234,EO-001,2\r\n",
    );

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);

    const records = JSON.parse(storage.get("outbound_records") ?? "[]");
    const parts = JSON.parse(storage.get("parts") ?? "[]");
    expect(records[0]).toMatchObject({
      partId: "part-1",
      partName: "エンジンオイル",
      customerName: "山田自動車,本店",
      quantity: 2,
    });
    expect(parts[0].currentStock).toBe(8);
  });

  it("imports inbound rows by part name and reports invalid rows", async () => {
    const result = await importInboundRecordsFromCSV(
      "日付,伝票番号,仕入先,部品名,数量\n" +
        "2026-09-01,IN-001,部品商会,エンジンオイル,２\n" +
        "2026-09-01,IN-002,部品商会,存在しない部品,1\n",
    );

    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain("存在しない部品");

    const records = JSON.parse(storage.get("inbound_records") ?? "[]");
    const parts = JSON.parse(storage.get("parts") ?? "[]");
    expect(records[0]).toMatchObject({
      partId: "part-1",
      partName: "エンジンオイル",
      supplier: "部品商会",
      quantity: 2,
    });
    expect(parts[0].currentStock).toBe(12);
  });
});
