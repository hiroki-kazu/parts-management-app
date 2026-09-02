export interface ManualSection {
  id: string;
  title: string;
  icon: string;
  content: string[];
  steps: string[];
}

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "outbound",
    title: "部品を使った（出庫入力）",
    icon: "📤",
    content: [
      "整備などで部品を使用した時に、出庫履歴を登録して在庫を減らします。",
      "入力項目は、日付・伝票番号・車両ナンバー下4桁・顧客名・部品・数量です。",
    ],
    steps: [
      "ホーム画面の「部品を使った」を開きます。",
      "日付、伝票番号、車両ナンバー下4桁、顧客名を入力します。",
      "部品を選択し、使用数量を入力します。",
      "複数部品を登録する場合は「＋ 部品追加」を押し、次の部品を選択します。",
      "追加部品一覧を確認し、「保存」でまとめて登録します。",
      "よく使う部品は品番で表示され、「編集」から変更できます。",
    ],
  },
  {
    id: "inbound",
    title: "部品を仕入れた（入庫入力）",
    icon: "📥",
    content: [
      "部品を仕入れた時に、入庫履歴を登録して在庫を増やします。",
      "入力項目は、日付・伝票番号・仕入先・部品・数量です。",
    ],
    steps: [
      "ホーム画面の「部品を仕入れた」を開きます。",
      "日付、伝票番号、仕入先を入力します。",
      "仕入先は直接入力できます。候補から選ぶ場合は対象をダブルタップします。",
      "部品を選択し、数量を入力します。",
      "複数部品を登録する場合は「＋ 部品追加」を押します。",
      "追加部品一覧を確認し、「保存」でまとめて登録します。",
    ],
  },
  {
    id: "inventory",
    title: "在庫を確認",
    icon: "📦",
    content: [
      "現在庫、最低在庫、単価、仕入先、在庫状態を一覧で確認する画面です。",
      "在庫一覧は確認専用です。在庫数は出庫入力・入庫入力の記録によって更新されます。",
    ],
    steps: [
      "ホーム画面の「在庫を確認」を開きます。",
      "上部の集計で、適正・発注推奨・警告の件数を確認します。",
      "各カードで品番、部品名、仕入先、現在庫、最低在庫、単価を確認します。",
      "最低在庫以下は警告、マイナス在庫は緊急表示になります。",
    ],
  },
  {
    id: "parts",
    title: "部品マスタ",
    icon: "🔧",
    content: [
      "Partsタブで部品マスタを確認・編集します。",
      "部品名、品番、仕入先、単価、最低在庫、小数数量への対応を管理します。",
    ],
    steps: [
      "画面下部の「Parts」を開きます。",
      "対象部品を選び、必要な項目を編集します。",
      "品番は履歴CSVインポート時の照合に使うため、重複しない値を設定します。",
      "仕入先は部品カードにも表示されます。",
    ],
  },
  {
    id: "history",
    title: "履歴を見る",
    icon: "🔍",
    content: [
      "出庫履歴と入庫履歴を切り替え、期間を指定して確認できます。",
      "出庫履歴には日付・伝票番号・車両ナンバー・顧客名・部品名・数量が表示されます。",
    ],
    steps: [
      "ホーム画面の「履歴を見る」を開きます。",
      "「出庫履歴」または「入庫履歴」を選択します。",
      "必要に応じて車両ナンバー下4桁と期間を指定します。",
      "「検索」を押して履歴一覧を表示します。",
    ],
  },
  {
    id: "data-processing",
    title: "データ処理・CSV",
    icon: "📊",
    content: [
      "部品マスタ、出庫履歴、入庫履歴のCSVテンプレート送信とインポート、期間指定ZIP出力を行います。",
      "CSVはUTF-8・Shift-JIS、カンマ・タブ区切りに対応しています。",
    ],
    steps: [
      "出庫履歴CSVの列は「日付・伝票番号・車両ナンバー・顧客名・品番・部品名・数量」です。",
      "入庫履歴CSVの列は「日付・伝票番号・仕入先・部品名・品番・数量」です。",
      "列名を変更せず、2行目以降へデータを入力します。",
      "履歴インポートでは品番を優先して部品マスタと照合します。",
      "完了画面の「履歴を確認」を押すと、保存された履歴を確認できます。",
      "期間指定エクスポートでは、出庫履歴・入庫履歴・在庫サマリーをZIPにまとめます。",
    ],
  },
  {
    id: "pdf-manual",
    title: "PDF取扱説明書",
    icon: "📄",
    content: [
      "このヘルプ画面の「取扱説明書をPDFで保存」から、最新の操作説明をPDFにできます。",
      "Androidの共有画面から、端末への保存、メール送信、クラウドドライブへの保存を選べます。",
    ],
    steps: [
      "ヘルプ画面上部の「取扱説明書をPDFで保存」を押します。",
      "PDF生成後に表示される共有画面で、保存先または送信先を選びます。",
      "ファイル名は「部品在庫管理_取扱説明書.pdf」です。",
    ],
  },
  {
    id: "faq",
    title: "よくある質問",
    icon: "❓",
    content: ["問題が起きた時は、以下を確認してください。"],
    steps: [
      "CSVを取り込めない場合：列名を変更していないか、品番が部品マスタに登録されているか確認します。",
      "CSVが空の場合：ヘッダーの次の行からデータを入力します。",
      "履歴が見えない場合：履歴画面で種類と期間を確認し、再度検索します。",
      "仕入先を候補から選べない場合：候補をダブルタップします。",
      "在庫が合わない場合：入庫・出庫履歴と数量を確認します。",
    ],
  },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildManualHtml(version: string, generatedAt = new Date()): string {
  const sections = MANUAL_SECTIONS.map(
    (section) => `
      <section>
        <h2>${escapeHtml(section.icon)} ${escapeHtml(section.title)}</h2>
        ${section.content.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        <ol>
          ${section.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </section>`,
  ).join("");

  return `<!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body { color: #172033; font-family: sans-serif; font-size: 12px; line-height: 1.65; }
        header { border-bottom: 3px solid #2563eb; margin-bottom: 22px; padding-bottom: 14px; }
        h1 { color: #111827; font-size: 25px; margin: 0 0 6px; }
        .meta { color: #64748b; font-size: 10px; }
        section { break-inside: avoid; border: 1px solid #dbe4f0; border-radius: 10px; margin: 0 0 14px; padding: 14px 16px; }
        h2 { color: #1d4ed8; font-size: 17px; margin: 0 0 8px; }
        p { margin: 4px 0; }
        ol { margin: 9px 0 0; padding-left: 22px; }
        li { margin: 4px 0; }
        .notice { background: #eff6ff; border-left: 4px solid #2563eb; padding: 10px 12px; margin: 12px 0 18px; }
        footer { color: #64748b; font-size: 9px; margin-top: 18px; text-align: center; }
      </style>
    </head>
    <body>
      <header>
        <h1>部品在庫管理 取扱説明書</h1>
        <div class="meta">アプリバージョン ${escapeHtml(version)} ／ 作成日 ${escapeHtml(generatedAt.toLocaleDateString("ja-JP"))}</div>
      </header>
      <div class="notice">この説明書は、アプリ内の現在の操作方法とCSV仕様をまとめたものです。</div>
      ${sections}
      <footer>部品在庫管理 — アプリ内ヘルプから生成</footer>
    </body>
  </html>`;
}
