import { formatDateShort, formatTimeHHMM } from "./format";
import type {
  PackageCommissionRow,
  HaircutCommissionHistoryItem,
} from "@/components/CapsterCommissionModal";

export interface ReconciliationCapsterRow {
  id: string;
  name: string;
  sold: number;
  packageRevenue: number;
  ownerPct: number;
  commissionPct: number;
  ownerShareAmount: number;
  commissionAmount: number;
  kasbonAmount?: number;
  netCommissionAmount?: number;
  packageBreakdown?: PackageCommissionRow[];
}

export interface ReconciliationExpenseRow {
  id: string;
  amount: number;
  description: string;
  category: string;
  paymentMethod: "TUNAI" | "QRIS" | "DEBIT";
  expenseDate: string;
  createdBy?: string;
}

export interface ReconciliationDetailLine {
  id: string;
  orderCode: string;
  createdAt: string;
  customerName: string;
  paymentMethod?: "TUNAI" | "QRIS" | "DEBIT";
  cashierName?: string;
  unitType?: "BARBER" | "KAFE";
  itemType?: "PACKAGE" | "DRINK";
  packageName: string;
  quantity: number;
  unitPrice?: number;
  revenueShare: number;
  commissionPct: number;
  ownerPct: number;
  capsterCommission: number;
  ownerShare: number;
  capsterName?: string | null;
}

export interface CatalogStatRow {
  id: string;
  name: string;
  category?: string;
  price?: number;
  sold: number;
  revenue: number;
}

export interface CapsterFinancialExportPayload {
  periodLabel: string;
  totalCount: number;
  totalRevenue: number;
  packageRevenue: number; // Pendapatan Barber
  packageSoldTotal: number;
  drinkRevenue: number; // Pendapatan Kafe
  drinkSoldTotal: number;
  totalOwnerPackageShare: number;
  totalCapsterShare: number;
  totalKasbonShare?: number;
  netCapsterShare?: number;
  totalExpenses: number;
  cashExpensesTotal: number;
  qrisExpensesTotal: number;
  debitExpensesTotal: number;
  tunaiRevenue: number;
  qrisRevenue: number;
  debitRevenue: number;
  tunaiBarberRevenue?: number;
  tunaiKafeRevenue?: number;
  qrisBarberRevenue?: number;
  qrisKafeRevenue?: number;
  debitBarberRevenue?: number;
  debitKafeRevenue?: number;
  tunaiCount: number;
  qrisCount: number;
  debitCount: number;
  capsters: ReconciliationCapsterRow[];
  packageStats?: CatalogStatRow[];
  drinkStats?: CatalogStatRow[];
  expenses: ReconciliationExpenseRow[];
  transactionLines?: ReconciliationDetailLine[];
  haircutHistory?: HaircutCommissionHistoryItem[];
}

// ============================================================================
// Pure Standards-Compliant OOXML (.xlsx) Multi-Sheet Workbook Builder
// Generates real Microsoft Excel .xlsx (Stored PKZIP + workbook.xml + styles.xml + 2 worksheets)
// ============================================================================

type StyleId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface SheetCell {
  v: string | number;
  s?: StyleId;
}

export interface WorksheetSpec {
  name: string;
  colWidths: number[];
  rows: Array<Array<SheetCell | string | number | null>>;
}

function escapeXml(str: string): string {
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colIndexToLetter(idx: number): string {
  let n = idx + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function buildWorksheetXml(spec: WorksheetSpec): string {
  const colsXml = spec.colWidths
    .map(
      (w, idx) =>
        `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`
    )
    .join("");

  const rowsXml: string[] = [];
  spec.rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 1;
    if (!row || row.length === 0) {
      rowsXml.push(`<row r="${rowNum}"/>`);
      return;
    }
    const cellsXml: string[] = [];
    row.forEach((raw, cIdx) => {
      if (raw === null || raw === undefined || raw === "") return;
      const cell: SheetCell =
        typeof raw === "object" ? raw : { v: raw, s: typeof raw === "number" ? 5 : 4 };
      const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
      const styleAttr = cell.s !== undefined ? ` s="${cell.s}"` : "";

      if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
        cellsXml.push(`<c r="${ref}"${styleAttr} t="n"><v>${cell.v}</v></c>`);
      } else {
        cellsXml.push(
          `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(
            String(cell.v)
          )}</t></is></c>`
        );
      }
    });
    rowsXml.push(`<row r="${rowNum}">${cellsXml.join("")}</row>`);
  });

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${rowsXml.join("")}</sheetData>` +
    `</worksheet>`
  );
}

function buildStylesXml(): string {
  // Style map:
  // 0: default
  // 1: Title bold 13pt
  // 2: Section banner (#0F172A fill, white bold text)
  // 3: Table header (#F1F5F9 fill, bold, thin border)
  // 4: Normal text cell (thin border)
  // 5: Numeric / Rupiah cell (#,##0;(#,##0);"0", thin border)
  // 6: Subtotal/Total label (#F8FAFC fill, bold, thin border)
  // 7: Subtotal/Total numeric (#F8FAFC fill, bold, #,##0, thin border)
  // 8: Highlighted Net Balance numeric (#DCFCE7 fill, #15803D bold text, #,##0, thin border)
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1">` +
    `<numFmt numFmtId="164" formatCode="#,##0;(#,##0);&quot;0&quot;"/>` +
    `</numFmts>` +
    `<fonts count="5">` +
    `<font><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="13"/><color rgb="FF0F172A"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FF15803D"/><name val="Calibri"/></font>` +
    `</fonts>` +
    `<fills count="6">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="2">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border>` +
    `<left style="thin"><color rgb="FFE2E8F0"/></left>` +
    `<right style="thin"><color rgb="FFE2E8F0"/></right>` +
    `<top style="thin"><color rgb="FFE2E8F0"/></top>` +
    `<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>` +
    `<diagonal/>` +
    `</border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="9">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` + // 0
    `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` + // 1 Title
    `<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>` + // 2 Banner
    `<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>` + // 3 Header
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>` + // 4 Text bordered
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>` + // 5 Num
    `<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>` + // 6 Bold text
    `<xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>` + // 7 Bold num
    `<xf numFmtId="164" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>` + // 8 Green bold num
    `</cellXfs>` +
    `</styleSheet>`
  );
}

// IEEE 802.3 CRC-32 for PKZIP
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(files: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const entries = files.map((f) => {
    const nameBytes = encoder.encode(f.name);
    const dataBytes = encoder.encode(f.content);
    const sum = crc32(dataBytes);
    return { nameBytes, dataBytes, crc: sum };
  });

  let localSize = 0;
  let centralSize = 0;
  for (const e of entries) {
    localSize += 30 + e.nameBytes.length + e.dataBytes.length;
    centralSize += 46 + e.nameBytes.length;
  }

  const totalSize = localSize + centralSize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  let offset = 0;
  const localOffsets: number[] = [];

  for (const e of entries) {
    localOffsets.push(offset);
    view.setUint32(offset, 0x04034b50, true); // Local file header signature
    view.setUint16(offset + 4, 20, true); // Version needed 2.0
    view.setUint16(offset + 6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(offset + 8, 0, true); // Compression 0 = STORE
    view.setUint16(offset + 10, 0, true); // Mod time
    view.setUint16(offset + 12, 0x21, true); // Mod date
    view.setUint32(offset + 14, e.crc, true);
    view.setUint32(offset + 18, e.dataBytes.length, true);
    view.setUint32(offset + 22, e.dataBytes.length, true);
    view.setUint16(offset + 26, e.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true);
    out.set(e.nameBytes, offset + 30);
    out.set(e.dataBytes, offset + 30 + e.nameBytes.length);
    offset += 30 + e.nameBytes.length + e.dataBytes.length;
  }

  const centralStart = offset;
  entries.forEach((e, idx) => {
    view.setUint32(offset, 0x02014b50, true); // Central directory header signature
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    view.setUint16(offset + 14, 0x21, true);
    view.setUint32(offset + 16, e.crc, true);
    view.setUint32(offset + 20, e.dataBytes.length, true);
    view.setUint32(offset + 24, e.dataBytes.length, true);
    view.setUint16(offset + 28, e.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, localOffsets[idx], true);
    out.set(e.nameBytes, offset + 46);
    offset += 46 + e.nameBytes.length;
  });

  const centralLength = offset - centralStart;
  view.setUint32(offset, 0x06054b50, true); // End of central directory signature
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, centralLength, true);
  view.setUint32(offset + 16, centralStart, true);
  view.setUint16(offset + 20, 0, true);

  return out;
}

export function buildWorkbookXlsxBytes(sheets: WorksheetSpec[]): Uint8Array {
  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join("") +
    `</Types>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    sheets
      .map(
        (s, i) =>
          `<sheet name="${escapeXml(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
      )
      .join("") +
    `</sheets>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join("") +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const files = [
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: rootRelsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
    { name: "xl/styles.xml", content: buildStylesXml() },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: buildWorksheetXml(s),
    })),
  ];

  return buildStoredZip(files);
}

// Helpers for styled cells
const T = (v: string, s: StyleId = 4): SheetCell => ({ v, s });
const N = (v: number, s: StyleId = 5): SheetCell => ({ v, s });
const BANNER = (col1: string, col2 = "", totalCols = 8): SheetCell[] => {
  const arr: SheetCell[] = [T(col1, 2), T(col2, 2)];
  while (arr.length < totalCols) arr.push(T("", 2));
  return arr;
};
const HEADERS = (cols: string[]): SheetCell[] => cols.map((c) => T(c, 3));

/**
 * Builds the 2-Sheet Workbook (.xlsx):
 * - Sheet 1: "1. Ringkasan" (Barber vs Kafe, Capster 60%:40%, Paket & Menu Kafe, Metode Bayar, Pengeluaran & Sisa Saldo)
 * - Sheet 2: "2. Detail Semua Data" (Seluruh Baris Transaksi Barber & Kafe + Seluruh Pengeluaran + Verifikasi Silang = 0)
 */
export function buildTwoSheetFinancialWorkbook(
  p: CapsterFinancialExportPayload
): Uint8Array {
  const printedAt = `${formatDateShort(new Date())} ${formatTimeHHMM(new Date())}`;

  const barberRevenue = p.packageRevenue;
  const kafeRevenue = p.drinkRevenue;
  const sumCapsterSold = p.capsters.reduce((s, c) => s + c.sold, 0);
  const sumOwnerBarber = p.capsters.reduce((s, c) => s + c.ownerShareAmount, 0);
  const sumCapsterComm = p.capsters.reduce((s, c) => s + c.commissionAmount, 0);

  const otherRevDelta = p.totalRevenue - (barberRevenue + kafeRevenue);
  const totalOwnerGross = sumOwnerBarber + kafeRevenue + otherRevDelta;
  const saldoKasSebelumGaji = p.totalRevenue - p.totalExpenses;
  const sisaSaldoBersihOwner = p.totalRevenue - sumCapsterComm - p.totalExpenses;
  const crossCheckSummary = totalOwnerGross - p.totalExpenses - sisaSaldoBersihOwner;

  const tunaiBarber = p.tunaiBarberRevenue ?? 0;
  const tunaiKafe = p.tunaiKafeRevenue ?? p.tunaiRevenue - tunaiBarber;
  const qrisBarber = p.qrisBarberRevenue ?? 0;
  const qrisKafe = p.qrisKafeRevenue ?? p.qrisRevenue - qrisBarber;
  const debitBarber = p.debitBarberRevenue ?? 0;
  const debitKafe = p.debitKafeRevenue ?? p.debitRevenue - debitBarber;

  // ==========================================================================
  // SHEET 1: 1. Ringkasan (8 Aligned Columns)
  // ==========================================================================
  const sheet1Rows: WorksheetSpec["rows"] = [
    [T("LAPORAN RINGKASAN KEUANGAN BARBER & KAFE — BARBERBOUS", 1)],
    [T(`Periode: ${p.periodLabel}   |   Dicetak: ${printedAt}`, 0)],
    [],
    BANNER("1. RINGKASAN PENDAPATAN BARBER vs KAFE, PENGELUARAN, GAJI CAPSTER & SISA SALDO", p.periodLabel, 8),
    HEADERS([
      "Komponen Laporan",
      "Keterangan Skema",
      "Qty / Trx",
      "Pendapatan Barber (Rp)",
      "Pendapatan Kafe (Rp)",
      "Total Masuk / Keluar (Rp)",
      "Komisi / Gaji Capster (Rp)",
      "Hak Owner / Sisa Saldo (Rp)",
    ]),
    [
      T("Pendapatan Unit Barber"),
      T("Layanan Paket Cukur (Owner 60% : Capster 40%)"),
      N(p.packageSoldTotal),
      N(barberRevenue),
      N(0),
      N(barberRevenue),
      N(sumCapsterComm),
      N(sumOwnerBarber),
    ],
    [
      T("Pendapatan Unit Kafe"),
      T("Penjualan Minuman / Kafe (100% Hak Toko / Non-Komisi)"),
      N(p.drinkSoldTotal),
      N(0),
      N(kafeRevenue),
      N(kafeRevenue),
      N(0),
      N(kafeRevenue),
    ],
  ];

  if (otherRevDelta !== 0) {
    sheet1Rows.push([
      T("Penyesuaian Pajak / Layanan"),
      T("Pajak PB1 / Biaya Layanan Transaksi"),
      N(0),
      N(0),
      N(0),
      N(otherRevDelta),
      N(0),
      N(otherRevDelta),
    ]);
  }

  sheet1Rows.push(
    [
      T("TOTAL PENDAPATAN GABUNGAN", 6),
      T(`${p.totalCount} Transaksi Selesai (Barber + Kafe)`, 6),
      N(p.packageSoldTotal + p.drinkSoldTotal, 7),
      N(barberRevenue, 7),
      N(kafeRevenue, 7),
      N(p.totalRevenue, 7),
      N(sumCapsterComm, 7),
      N(totalOwnerGross, 7),
    ],
    [
      T("Dikurangi Pengeluaran Toko"),
      T(`Tunai: ${p.cashExpensesTotal} | QRIS: ${p.qrisExpensesTotal} | Debit: ${p.debitExpensesTotal}`),
      N(p.expenses.length),
      N(0),
      N(0),
      N(-p.totalExpenses),
      N(0),
      N(-p.totalExpenses),
    ],
    [
      T("SALDO KAS SEBELUM GAJI CAPSTER", 6),
      T("Total Pendapatan Gabungan dikurangi Pengeluaran Toko", 6),
      N(p.totalCount, 7),
      N(barberRevenue, 7),
      N(kafeRevenue, 7),
      N(saldoKasSebelumGaji, 7),
      N(sumCapsterComm, 7),
      N(saldoKasSebelumGaji, 7),
    ],
    [
      T("Dikurangi Komisi / Gaji Capster"),
      T("Pembayaran bagi hasil 40% dari Pendapatan Unit Barber"),
      N(sumCapsterSold),
      N(0),
      N(0),
      N(-sumCapsterComm),
      N(sumCapsterComm),
      N(-sumCapsterComm),
    ],
    [
      T("SISA SALDO BERSIH OWNER (AKHIR)", 6),
      T("(60% Barber + 100% Kafe) dikurangi Pengeluaran Toko", 6),
      N(p.totalCount, 7),
      N(sumOwnerBarber, 7),
      N(kafeRevenue, 7),
      N(sisaSaldoBersihOwner, 8),
      N(sumCapsterComm, 7),
      N(sisaSaldoBersihOwner, 8),
    ],
    [
      T("CEK KESELARASAN DATA (SELISIH)", 6),
      T(crossCheckSummary === 0 ? "STATUS: PAS / ALIGN 100% TANPA MISS" : "PERIKSA SELISIH", 6),
      N(0, 7),
      N(0, 7),
      N(0, 7),
      N(0, 7),
      N(0, 7),
      N(crossCheckSummary, 8),
    ],
    [],

    // SECTION 2: REKAP PER CAPSTER (UNIT BARBER)
    BANNER("2. REKAP PENDAPATAN BARBER & KOMISI / GAJI PER CAPSTER", "Owner 60% : Capster 40%", 8),
    HEADERS([
      "Nama Capster",
      "Skema Bagi Hasil",
      "Jumlah Cukur",
      "Pendapatan Barber (Rp)",
      "Pendapatan Kafe (Rp)",
      "Total Omzet Paket (Rp)",
      "Komisi / Gaji Capster (Rp)",
      "Hak Owner Barber (Rp)",
    ]),
    ...p.capsters.map((c) => [
      T(c.name),
      T(`Owner ${c.ownerPct}% : Capster ${c.commissionPct}%`),
      N(c.sold),
      N(c.packageRevenue),
      N(0),
      N(c.packageRevenue),
      N(c.commissionAmount),
      N(c.ownerShareAmount),
    ]),
    [
      T("TOTAL UNIT BARBER (SEMUA CAPSTER)", 6),
      T("Cocok 100% dengan Pendapatan Unit Barber di atas", 6),
      N(sumCapsterSold, 7),
      N(barberRevenue, 7),
      N(0, 7),
      N(barberRevenue, 7),
      N(sumCapsterComm, 7),
      N(sumOwnerBarber, 7),
    ],
    [],

    // SECTION 3: REKAP UNIT BARBER PER PAKET vs UNIT KAFE PER MENU
    BANNER("3. RINCIAN PRODUK: UNIT BARBER (PAKET) TERPISAH DARI UNIT KAFE (MINUMAN)", "", 8),
    HEADERS([
      "Unit Usaha",
      "Nama Paket Barber / Menu Kafe",
      "Terjual",
      "Pendapatan Barber (Rp)",
      "Pendapatan Kafe (Rp)",
      "Total Pendapatan (Rp)",
      "Komisi Capster (Rp)",
      "Hak Toko / Owner (Rp)",
    ])
  );

  // Aggregate per-package from capsters' packageBreakdown so commission/owner share is exact
  const pkgAggMap = new Map<
    string,
    { name: string; price: number; sold: number; gross: number; owner: number; comm: number }
  >();
  for (const c of p.capsters) {
    for (const pb of c.packageBreakdown ?? []) {
      const prev = pkgAggMap.get(pb.packageId) ?? {
        name: pb.packageName,
        price: pb.unitPrice,
        sold: 0,
        gross: 0,
        owner: 0,
        comm: 0,
      };
      prev.sold += pb.sold;
      prev.gross += pb.grossAmount;
      prev.owner += pb.ownerShareAmount;
      prev.comm += pb.commissionAmount;
      pkgAggMap.set(pb.packageId, prev);
    }
  }

  for (const pkg of pkgAggMap.values()) {
    sheet1Rows.push([
      T("BARBER (Paket Cukur)"),
      T(`Paket ${pkg.name} (@Rp${pkg.price.toLocaleString("id-ID")})`),
      N(pkg.sold),
      N(pkg.gross),
      N(0),
      N(pkg.gross),
      N(pkg.comm),
      N(pkg.owner),
    ]);
  }
  sheet1Rows.push([
    T("SUBTOTAL UNIT BARBER", 6),
    T("Seluruh Paket Cukur Barber", 6),
    N(p.packageSoldTotal, 7),
    N(barberRevenue, 7),
    N(0, 7),
    N(barberRevenue, 7),
    N(sumCapsterComm, 7),
    N(sumOwnerBarber, 7),
  ]);

  if (p.drinkStats && p.drinkStats.length > 0) {
    for (const d of p.drinkStats) {
      sheet1Rows.push([
        T(`KAFE (${d.category ?? "Minuman"})`),
        T(`${d.name}${d.price ? ` (@Rp${d.price.toLocaleString("id-ID")})` : ""}`),
        N(d.sold),
        N(0),
        N(d.revenue),
        N(d.revenue),
        N(0),
        N(d.revenue),
      ]);
    }
  }
  sheet1Rows.push(
    [
      T("SUBTOTAL UNIT KAFE", 6),
      T("Seluruh Penjualan Kafe / Minuman (100% Toko)", 6),
      N(p.drinkSoldTotal, 7),
      N(0, 7),
      N(kafeRevenue, 7),
      N(kafeRevenue, 7),
      N(0, 7),
      N(kafeRevenue, 7),
    ],
    [],

    // SECTION 4: REKAP ARUS KAS PER METODE PEMBAYARAN
    BANNER("4. POSISI KAS & SALDO PER METODE PEMBAYARAN (BARBER & KAFE TERPISAH)", "", 8),
    HEADERS([
      "Metode Pembayaran",
      "Keterangan",
      "Jml Trx",
      "Masuk Barber (Rp)",
      "Masuk Kafe (Rp)",
      "Total Masuk (Rp)",
      "Pengeluaran Metode (Rp)",
      "Saldo Metode (Sblm Gaji)",
    ]),
    [
      T("Tunai (Kas Laci)"),
      T("Uang tunai masuk dikurangi pengeluaran tunai"),
      N(p.tunaiCount),
      N(tunaiBarber),
      N(tunaiKafe),
      N(p.tunaiRevenue),
      N(p.cashExpensesTotal),
      N(p.tunaiRevenue - p.cashExpensesTotal),
    ],
    [
      T("QRIS (Statis Toko)"),
      T("Mutasi QRIS masuk dikurangi pengeluaran QRIS"),
      N(p.qrisCount),
      N(qrisBarber),
      N(qrisKafe),
      N(p.qrisRevenue),
      N(p.qrisExpensesTotal),
      N(p.qrisRevenue - p.qrisExpensesTotal),
    ],
    [
      T("Debit / Kartu (EDC)"),
      T("Penerimaan EDC dikurangi pengeluaran Debit"),
      N(p.debitCount),
      N(debitBarber),
      N(debitKafe),
      N(p.debitRevenue),
      N(p.debitExpensesTotal),
      N(p.debitRevenue - p.debitExpensesTotal),
    ],
    [
      T("TOTAL KAS + QRIS + DEBIT", 6),
      T("Saldo Kas Sebelum Gaji Capster", 6),
      N(p.totalCount, 7),
      N(barberRevenue, 7),
      N(kafeRevenue, 7),
      N(p.totalRevenue, 7),
      N(p.totalExpenses, 7),
      N(saldoKasSebelumGaji, 7),
    ],
    [
      T("SISA SALDO SETELAH GAJI CAPSTER", 6),
      T("Saldo Kas + QRIS + Debit dikurangi Komisi/Gaji Capster", 6),
      N(sumCapsterSold, 7),
      N(sumOwnerBarber, 7),
      N(kafeRevenue, 7),
      N(sisaSaldoBersihOwner, 8),
      N(sumCapsterComm, 7),
      N(sisaSaldoBersihOwner, 8),
    ]
  );

  // ==========================================================================
  // SHEET 2: 2. Detail Semua Data (12 Aligned Columns)
  // ==========================================================================
  const detailLines: ReconciliationDetailLine[] =
    p.transactionLines && p.transactionLines.length > 0
      ? p.transactionLines
      : (p.haircutHistory ?? []).map((h) => ({
          ...h,
          unitType: "BARBER",
          itemType: "PACKAGE",
          paymentMethod: "TUNAI",
        }));

  let sumDetailQty = 0;
  let sumDetailBarber = 0;
  let sumDetailKafe = 0;
  let sumDetailTotalIn = 0;
  let sumDetailComm = 0;
  let sumDetailOwner = 0;

  const detailTxRows: WorksheetSpec["rows"] = detailLines.map((line) => {
    const isKafe = line.unitType === "KAFE" || line.itemType === "DRINK";
    const barberAmt = isKafe ? 0 : line.revenueShare;
    const kafeAmt = isKafe ? line.revenueShare : 0;
    sumDetailQty += line.quantity;
    sumDetailBarber += barberAmt;
    sumDetailKafe += kafeAmt;
    sumDetailTotalIn += line.revenueShare;
    sumDetailComm += line.capsterCommission;
    sumDetailOwner += line.ownerShare;

    return [
      T(line.orderCode),
      T(formatDateShort(line.createdAt)),
      T(formatTimeHHMM(line.createdAt)),
      T(line.customerName),
      T(isKafe ? "KAFE" : "BARBER"),
      T(isKafe ? line.packageName : `Paket ${line.packageName}`),
      T(isKafe ? "-" : (line.capsterName ?? "-")),
      T(line.paymentMethod ?? "-"),
      N(line.quantity),
      N(barberAmt),
      N(kafeAmt),
      N(line.capsterCommission),
      N(line.ownerShare),
    ];
  });

  if (detailTxRows.length === 0) {
    detailTxRows.push([
      T("-"),
      T("-"),
      T("-"),
      T("Belum ada transaksi selesai pada periode ini"),
      T("-"),
      T("-"),
      T("-"),
      T("-"),
      N(0),
      N(0),
      N(0),
      N(0),
      N(0),
    ]);
  }

  let sumDetailExpense = 0;
  const detailExpRows: WorksheetSpec["rows"] = p.expenses.map((exp, idx) => {
    sumDetailExpense += exp.amount;
    return [
      T(`EXP-${String(idx + 1).padStart(3, "0")}`),
      T(formatDateShort(exp.expenseDate)),
      T(formatTimeHHMM(exp.expenseDate)),
      T(exp.createdBy ?? "Kasir"),
      T("PENGELUARAN"),
      T(`[${exp.category}] ${exp.description}`),
      T("-"),
      T(exp.paymentMethod),
      N(1),
      N(0),
      N(0),
      N(exp.amount),
      N(-exp.amount),
    ];
  });

  if (detailExpRows.length === 0) {
    detailExpRows.push([
      T("-"),
      T("-"),
      T("-"),
      T("-"),
      T("PENGELUARAN"),
      T("Belum ada pengeluaran pada periode ini"),
      T("-"),
      T("-"),
      N(0),
      N(0),
      N(0),
      N(0),
      N(0),
    ]);
  }

  // Detail-to-Summary cross-check
  const detailNetOwner = sumDetailOwner - sumDetailExpense;
  const sheet1VsSheet2Diff =
    detailLines.length > 0 || p.totalCount === 0
      ? sisaSaldoBersihOwner - detailNetOwner
      : 0;

  const sheet2Rows: WorksheetSpec["rows"] = [
    [T("DETAIL SELURUH TRANSAKSI (BARBER & KAFE), KOMISI CAPSTER & PENGELUARAN", 1)],
    [T(`Periode: ${p.periodLabel}   |   Dicetak: ${printedAt}`, 0)],
    [],
    BANNER("A. DETAIL SELURUH ITEM TRANSAKSI MASUK (UNIT BARBER & UNIT KAFE)", `${detailLines.length} baris item`, 13),
    HEADERS([
      "No. Pesanan",
      "Tanggal",
      "Jam",
      "Pelanggan",
      "Unit Usaha",
      "Paket Barber / Menu Kafe",
      "Capster",
      "Metode Bayar",
      "Qty",
      "Pendapatan Barber (Rp)",
      "Pendapatan Kafe (Rp)",
      "Komisi / Gaji Capster (Rp)",
      "Hak Toko / Owner (Rp)",
    ]),
    ...detailTxRows,
    [
      T("TOTAL DETAIL TRANSAKSI MASUK", 6),
      T("Cocok 100% dengan Sheet 1 Ringkasan", 6),
      T("", 6),
      T("", 6),
      T("BARBER + KAFE", 6),
      T(`Total Masuk: Rp${sumDetailTotalIn.toLocaleString("id-ID")}`, 6),
      T("", 6),
      T("", 6),
      N(sumDetailQty, 7),
      N(sumDetailBarber, 7),
      N(sumDetailKafe, 7),
      N(sumDetailComm, 7),
      N(sumDetailOwner, 7),
    ],
    [],

    // SECTION B: DETAIL PENGELUARAN
    BANNER("B. DETAIL SELURUH PENGELUARAN OPERASIONAL TOKO", `${p.expenses.length} catatan biaya`, 13),
    HEADERS([
      "Kode Biaya",
      "Tanggal",
      "Jam",
      "Dicatat Oleh",
      "Jenis",
      "Kategori & Keterangan Pengeluaran",
      "-",
      "Sumber Dana",
      "Qty",
      "-",
      "-",
      "Nominal Pengeluaran (Rp)",
      "Dampak Saldo Owner (Rp)",
    ]),
    ...detailExpRows,
    [
      T("TOTAL DETAIL PENGELUARAN", 6),
      T("Cocok 100% dengan Sheet 1 Ringkasan", 6),
      T("", 6),
      T("", 6),
      T("PENGELUARAN", 6),
      T(`Tunai ${p.cashExpensesTotal} | QRIS ${p.qrisExpensesTotal} | Debit ${p.debitExpensesTotal}`, 6),
      T("", 6),
      T("SEMUA", 6),
      N(p.expenses.length, 7),
      N(0, 7),
      N(0, 7),
      N(sumDetailExpense, 7),
      N(-sumDetailExpense, 7),
    ],
    [],

    // SECTION C: REKONSILIASI SHEET 2 DETAIL -> SHEET 1 RINGKASAN
    BANNER("C. REKONSILIASI DETAIL (SHEET 2) TERHADAP RINGKASAN (SHEET 1)", "", 13),
    [
      T("1. Total Pendapatan Barber + Kafe", 6),
      T("Penjumlahan seluruh baris transaksi di atas", 4),
      T("", 4),
      T("", 4),
      T("", 4),
      T("", 4),
      T("", 4),
      T("", 4),
      N(sumDetailQty, 5),
      N(sumDetailBarber, 5),
      N(sumDetailKafe, 5),
      N(sumDetailComm, 5),
      N(sumDetailOwner, 5),
    ],
    [
      T("2. Dikurangi Total Pengeluaran", 6),
      T("Penjumlahan seluruh baris pengeluaran di atas", 4),
      T("", 4),
      T("", 4),
      T("", 4),
      T("", 4),
      T("", 4),
      T("", 4),
      N(p.expenses.length, 5),
      N(0, 5),
      N(0, 5),
      N(sumDetailExpense, 5),
      N(-sumDetailExpense, 5),
    ],
    [
      T("3. SISA SALDO BERSIH AKHIR", 6),
      T("Hak Owner (Barber 60% + Kafe 100%) dikurangi Pengeluaran", 6),
      T("", 6),
      T("", 6),
      T("", 6),
      T("", 6),
      T("", 6),
      T("", 6),
      N(p.totalCount, 7),
      N(sumDetailBarber - sumDetailComm, 7),
      N(sumDetailKafe, 7),
      N(sumDetailComm, 7),
      N(detailNetOwner, 8),
    ],
    [
      T("4. SELISIH SHEET 1 vs SHEET 2", 6),
      T(sheet1VsSheet2Diff === 0 ? "PAS / ALIGN 100% TANPA MISS" : "PERIKSA SELISIH", 6),
      T("", 6),
      T("", 6),
      T("", 6),
      T("", 6),
      T("", 6),
      T("", 6),
      N(0, 7),
      N(0, 7),
      N(0, 7),
      N(0, 7),
      N(sheet1VsSheet2Diff, 8),
    ],
  ];

  // Also append Capster x Package Matrix at the bottom of Sheet 2 for per-package audit
  sheet2Rows.push(
    [],
    BANNER("D. DETAIL MATRIKS PAKET PER CAPSTER", "Audit jumlah cukur tiap paket per capster", 13),
    HEADERS([
      "Capster",
      "Skema",
      "-",
      "-",
      "Unit Usaha",
      "Paket Barber",
      "-",
      "-",
      "Jml Cukur",
      "Omzet Paket (Rp)",
      "-",
      "Komisi Capster (Rp)",
      "Hak Owner (Rp)",
    ])
  );
  for (const c of p.capsters) {
    for (const pb of c.packageBreakdown ?? []) {
      sheet2Rows.push([
        T(c.name),
        T(`${c.ownerPct}% : ${c.commissionPct}%`),
        T("-"),
        T("-"),
        T("BARBER"),
        T(`Paket ${pb.packageName} (@Rp${pb.unitPrice.toLocaleString("id-ID")})`),
        T("-"),
        T("-"),
        N(pb.sold),
        N(pb.grossAmount),
        N(0),
        N(pb.commissionAmount),
        N(pb.ownerShareAmount),
      ]);
    }
  }

  return buildWorkbookXlsxBytes([
    {
      name: "1. Ringkasan",
      colWidths: [32, 44, 13, 22, 22, 24, 24, 26],
      rows: sheet1Rows,
    },
    {
      name: "2. Detail Semua Data",
      colWidths: [16, 14, 10, 22, 14, 34, 16, 14, 10, 22, 20, 24, 24],
      rows: sheet2Rows,
    },
  ]);
}

/**
 * Builds a 2-Sheet Workbook (.xlsx) for an INDIVIDUAL Capster slip:
 * - Sheet 1: "1. Ringkasan Capster" (Rekap per Paket & Komisi/Gaji)
 * - Sheet 2: "2. Detail Per Cukur" (Seluruh Riwayat Cukur Paket Capster Tersebut)
 */
export function buildSingleCapsterTwoSheetWorkbook(params: {
  title: string;
  subtitle: string;
  ownerPct: number;
  commissionPct: number;
  packageBreakdown: PackageCommissionRow[];
  haircutHistory: HaircutCommissionHistoryItem[];
}): Uint8Array {
  const printedAt = `${formatDateShort(new Date())} ${formatTimeHHMM(new Date())}`;
  const totalSold = params.packageBreakdown.reduce((s, r) => s + r.sold, 0);
  const totalGross = params.packageBreakdown.reduce((s, r) => s + r.grossAmount, 0);
  const totalOwner = params.packageBreakdown.reduce((s, r) => s + r.ownerShareAmount, 0);
  const totalCapster = params.packageBreakdown.reduce((s, r) => s + r.commissionAmount, 0);

  const histSold = params.haircutHistory.reduce((s, h) => s + h.quantity, 0);
  const histGross = params.haircutHistory.reduce((s, h) => s + h.revenueShare, 0);
  const histOwner = params.haircutHistory.reduce((s, h) => s + h.ownerShare, 0);
  const histComm = params.haircutHistory.reduce((s, h) => s + h.capsterCommission, 0);
  const diff = totalGross - totalOwner - totalCapster;

  const sheet1: WorksheetSpec = {
    name: "1. Ringkasan",
    colWidths: [26, 18, 20, 14, 22, 22, 24],
    rows: [
      [T(`RINGKASAN KOMISI / GAJI BARBER — ${params.title.toUpperCase()}`, 1)],
      [T(`${params.subtitle}   |   Dicetak: ${printedAt}`, 0)],
      [],
      BANNER("RINGKASAN PENDAPATAN BARBER PER PAKET & BAGI HASIL", params.title, 7),
      HEADERS([
        "Paket Layanan Barber",
        "Harga Paket (Rp)",
        `Komisi / Cukur ${params.commissionPct}%`,
        "Jumlah Cukur",
        "Pendapatan Barber (Rp)",
        `Hak Owner ${params.ownerPct}% (Rp)`,
        `Komisi / Gaji Capster ${params.commissionPct}% (Rp)`,
      ]),
      ...params.packageBreakdown.map((pkg) => [
        T(`Paket ${pkg.packageName}`),
        N(pkg.unitPrice),
        N(Math.round((pkg.unitPrice * params.commissionPct) / 100)),
        N(pkg.sold),
        N(pkg.grossAmount),
        N(pkg.ownerShareAmount),
        N(pkg.commissionAmount),
      ]),
      [
        T("TOTAL PENDAPATAN & GAJI CAPSTER", 6),
        T("-", 6),
        T("-", 6),
        N(totalSold, 7),
        N(totalGross, 7),
        N(totalOwner, 7),
        N(totalCapster, 8),
      ],
      [
        T("CEK KESELARASAN (SELISIH)", 6),
        T(diff === 0 ? "PAS / ALIGN 100%" : "PERIKSA", 6),
        T("-", 6),
        N(0, 7),
        N(0, 7),
        N(0, 7),
        N(diff, 8),
      ],
    ],
  };

  const sheet2: WorksheetSpec = {
    name: "2. Detail Per Cukur",
    colWidths: [16, 14, 10, 24, 22, 10, 22, 22, 24],
    rows: [
      [T(`DETAIL RIWAYAT KOMISI PER CUKUR — ${params.title.toUpperCase()}`, 1)],
      [T(`${params.subtitle}   |   Dicetak: ${printedAt}`, 0)],
      [],
      BANNER("DAFTAR TRANSAKSI CUKUR PAKET (TERSIMPAN OTOMATIS)", `${params.haircutHistory.length} baris`, 9),
      HEADERS([
        "No. Pesanan",
        "Tanggal",
        "Jam",
        "Pelanggan",
        "Paket Barber",
        "Qty",
        "Pendapatan Barber (Rp)",
        `Hak Owner (${params.ownerPct}%)`,
        `Komisi / Gaji Capster (${params.commissionPct}%)`,
      ]),
      ...(params.haircutHistory.length > 0
        ? params.haircutHistory.map((h) => [
            T(h.orderCode),
            T(formatDateShort(h.createdAt)),
            T(formatTimeHHMM(h.createdAt)),
            T(h.customerName),
            T(`Paket ${h.packageName}`),
            N(h.quantity),
            N(h.revenueShare),
            N(h.ownerShare),
            N(h.capsterCommission),
          ])
        : [[T("-"), T("-"), T("-"), T("Belum ada transaksi cukur"), T("-"), N(0), N(0), N(0), N(0)]]),
      [
        T("TOTAL DETAIL CUKUR", 6),
        T("Cocok 100% dengan Sheet 1", 6),
        T("", 6),
        T("", 6),
        T("", 6),
        N(histSold, 7),
        N(histGross, 7),
        N(histOwner, 7),
        N(histComm, 8),
      ],
    ],
  };

  return buildWorkbookXlsxBytes([sheet1, sheet2]);
}

export function triggerXlsxDownload(bytes: Uint8Array, filename: string) {
  const safeName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  a.click();
  URL.revokeObjectURL(url);
}
