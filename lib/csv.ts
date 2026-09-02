import Encoding from "encoding-japanese";

export type CSVEncoding =
  | "UTF8"
  | "SJIS"
  | "EUCJP"
  | "JIS"
  | "UTF16LE"
  | "UTF16BE"
  | "ASCII"
  | "BINARY";

/**
 * BOM・改行コードを統一し、CSVの文字列を安全に扱える状態にします。
 */
export function normalizeCSVText(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
}

/**
 * ダブルクォート内のカンマ・改行・エスケープ（""）に対応したCSV解析。
 */
function detectCSVDelimiter(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim().length > 0) ?? "";
  const candidates = [",", "\t", ";"];
  const counts = candidates.map((delimiter) => {
    let count = 0;
    let quoted = false;
    for (let index = 0; index < firstLine.length; index += 1) {
      const character = firstLine[index];
      if (character === '"') {
        if (quoted && firstLine[index + 1] === '"') {
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (!quoted && character === delimiter) {
        count += 1;
      }
    }
    return count;
  });
  const bestIndex = counts.indexOf(Math.max(...counts));
  return counts[bestIndex] > 0 ? candidates[bestIndex] : ",";
}

export function parseCSV(value: string): string[][] {
  const text = normalizeCSVText(value);
  const delimiter = detectCSVDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const pushCell = () => {
    row.push(cell.trim());
    cell = "";
  };

  const pushRow = () => {
    pushCell();
    if (row.some((column) => column.length > 0)) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      pushCell();
    } else if (character === "\n") {
      pushRow();
    } else {
      cell += character;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}

/**
 * AndroidのExcel等で保存されるShift-JISを含むCSVを、Unicode文字列に変換します。
 */
export function decodeCSVBase64(base64: string): {
  text: string;
  encoding: CSVEncoding;
} {
  const bytes = Encoding.base64Decode(base64.replace(/\s/g, ""));

  const hasUtf16LEBOM = bytes[0] === 0xff && bytes[1] === 0xfe;
  const hasUtf16BEBOM = bytes[0] === 0xfe && bytes[1] === 0xff;
  const detected = Encoding.detect(bytes);

  let sourceEncoding: CSVEncoding;
  if (hasUtf16LEBOM) {
    sourceEncoding = "UTF16LE";
  } else if (hasUtf16BEBOM) {
    sourceEncoding = "UTF16BE";
  } else if (
    detected === "SJIS" ||
    detected === "EUCJP" ||
    detected === "JIS" ||
    detected === "UTF8" ||
    detected === "ASCII" ||
    detected === "BINARY"
  ) {
    sourceEncoding = detected;
  } else {
    // 判定できない場合は、一般的なCSVの既定値であるUTF-8として扱います。
    sourceEncoding = "UTF8";
  }

  const unicodeCodes = Encoding.convert(bytes, {
    to: "UNICODE",
    from: sourceEncoding,
  });

  return {
    text: normalizeCSVText(Encoding.codeToString(unicodeCodes)),
    encoding: sourceEncoding,
  };
}

/**
 * CSVヘッダーの比較用に、全角空白などの表記ゆれを吸収します。
 */
export function normalizeCSVHeader(value: string): string {
  return value
    .replace(/[\uFEFF\u3000\s]/g, "")
    .toLowerCase();
}

/**
 * 複数の候補名から、CSVヘッダー上の列番号を探します。
 */
export function findCSVColumn(
  headers: string[],
  aliases: string[],
  fallbackIndex?: number,
): number {
  const normalizedHeaders = headers.map(normalizeCSVHeader);
  const normalizedAliases = aliases.map(normalizeCSVHeader);

  const foundIndex = normalizedHeaders.findIndex((header) =>
    normalizedAliases.includes(header),
  );

  return foundIndex >= 0 ? foundIndex : (fallbackIndex ?? -1);
}

/**
 * CSV値を比較・保存しやすい形にします。
 */
export function normalizeCSVValue(value: string | undefined): string {
  return (value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\u3000/g, " ")
    .trim();
}
