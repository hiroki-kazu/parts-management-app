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
  generateInboundRecordsCSVTemplate,
  generateOutboundRecordsCSVTemplate,
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
  it("generates history templates with a part number column", async () => {
    storage.set(
      "outbound_records",
      JSON.stringify([
        {
          id: "out-1",
          date: "2026-09-01",
          voucherNumber: "OUT-001",
          customerName: "山田自動車",
          vehicleNumber: "1234",
          partId: "part-1",
          partName: "エンジンオイル",
          quantity: 2,
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ]),
    );
    storage.set(
      "inbound_records",
      JSON.stringify([
        {
          id: "in-1",
          date: "2026-09-01",
          voucherNumber: "IN-001",
          supplier: "部品商会",
          partId: "part-1",
          partName: "エンジンオイル",
          quantity: 2,
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ]),
    );

    const outboundTemplate = await generateOutboundRecordsCSVTemplate();
    const inboundTemplate = await generateInboundRecordsCSVTemplate();

    expect(outboundTemplate.split("\n")[0]).toBe(
      "日付,伝票番号,顧客名,車両ナンバー,部品名,品番,数量",
    );
    expect(outboundTemplate).toContain("エンジンオイル,EO-001,2");
    expect(inboundTemplate.split("\n")[0]).toBe(
      "日付,伝票番号,仕入先,部品名,品番,数量",
    );
    expect(inboundTemplate).toContain("エンジンオイル,EO-001,2");
  });
  it("imports outbound rows by part number and preserves quoted fields", async () => {
    const result = await importOutboundRecordsFromCSV(
      "日付,伝票番号,顧客名,ナンバー,部品名,品番,数量\r\n" +
        "2026/09/01,OUT-001,\"山田自動車,本店\",1234,名称が違っても,EO-001,2\r\n",
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

  it("prefers the part number in the new inbound format", async () => {
    const result = await importInboundRecordsFromCSV(
      "日付,伝票番号,仕入先,部品名,品番,数量\n" +
        "2026-09-01,IN-003,部品商会,名称が違っても,EO-001,3\n",
    );

    expect(result).toMatchObject({ success: 1, failed: 0 });
    const records = JSON.parse(storage.get("inbound_records") ?? "[]");
    expect(records[0]).toMatchObject({ partId: "part-1", quantity: 3 });
  });

  it("re-imports an outbound CSV generated by the app and persists the row", async () => {
    storage.set(
      "outbound_records",
      JSON.stringify([
        {
          id: "source-out",
          date: "2026-09-02",
          voucherNumber: "OUT-ROUNDTRIP",
          customerName: "山田自動車",
          vehicleNumber: "1234",
          partId: "part-1",
          partName: "エンジンオイル",
          quantity: 2,
          createdAt: "2026-09-02T00:00:00.000Z",
        },
      ]),
    );
    const generatedCSV = await generateOutboundRecordsCSVTemplate();
    storage.set("outbound_records", JSON.stringify([]));

    const result = await importOutboundRecordsFromCSV(`\uFEFF${generatedCSV}`);

    expect(result).toMatchObject({ success: 1, failed: 0 });
    const importedRecords = JSON.parse(storage.get("outbound_records") ?? "[]");
    expect(importedRecords).toHaveLength(1);
    expect(importedRecords[0]).toMatchObject({
      voucherNumber: "OUT-ROUNDTRIP",
      partId: "part-1",
      quantity: 2,
    });
  });

  it("re-imports an inbound CSV generated by the app and persists the row", async () => {
    storage.set(
      "inbound_records",
      JSON.stringify([
        {
          id: "source-in",
          date: "2026-09-02",
          voucherNumber: "IN-ROUNDTRIP",
          supplier: "部品商会",
          partId: "part-1",
          partName: "エンジンオイル",
          quantity: 4,
          createdAt: "2026-09-02T00:00:00.000Z",
        },
      ]),
    );
    const generatedCSV = await generateInboundRecordsCSVTemplate();
    storage.set("inbound_records", JSON.stringify([]));

    const result = await importInboundRecordsFromCSV(`\uFEFF${generatedCSV}`);

    expect(result).toMatchObject({ success: 1, failed: 0 });
    const importedRecords = JSON.parse(storage.get("inbound_records") ?? "[]");
    expect(importedRecords).toHaveLength(1);
    expect(importedRecords[0]).toMatchObject({
      voucherNumber: "IN-ROUNDTRIP",
      partId: "part-1",
      quantity: 4,
    });
  });

  it("reports header-only history CSVs instead of silently succeeding", async () => {
    const outboundResult = await importOutboundRecordsFromCSV(
      "日付,伝票番号,顧客名,車両ナンバー,部品名,品番,数量\n",
    );
    const inboundResult = await importInboundRecordsFromCSV(
      "日付,伝票番号,仕入先,部品名,品番,数量\n",
    );

    expect(outboundResult).toMatchObject({ success: 0, failed: 1 });
    expect(outboundResult.errors[0]).toContain("ヘッダーしかありません");
    expect(inboundResult).toMatchObject({ success: 0, failed: 1 });
    expect(inboundResult.errors[0]).toContain("ヘッダーしかありません");
  });
});
