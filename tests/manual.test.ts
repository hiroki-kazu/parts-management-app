import { describe, expect, it } from "vitest";

import { buildManualHtml, MANUAL_SECTIONS } from "../lib/manual";

describe("PDF manual", () => {
  it("contains the current outbound, inbound, history, CSV, and PDF guidance", () => {
    const titles = MANUAL_SECTIONS.map((section) => section.title);

    expect(titles).toContain("部品を使った（出庫入力）");
    expect(titles).toContain("部品を仕入れた（入庫入力）");
    expect(titles).toContain("履歴を見る");
    expect(titles).toContain("データ処理・CSV");
    expect(titles).toContain("PDF取扱説明書");
  });

  it("builds a well-formed A4 Japanese manual", () => {
    const html = buildManualHtml("1.0.7", new Date("2026-09-02T00:00:00.000Z"));

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("@page { size: A4;");
    expect(html).toContain("部品在庫管理 取扱説明書");
    expect(html).toContain("アプリバージョン 1.0.7");
    expect(html).toContain("日付・伝票番号・車両ナンバー・顧客名・品番・部品名・数量");
    expect(html).toContain("部品在庫管理_取扱説明書.pdf");
  });
});
