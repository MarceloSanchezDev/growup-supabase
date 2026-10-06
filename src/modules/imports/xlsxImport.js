import * as XLSX from "xlsx";

const monthByName = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
};

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sourceDate(value, monthName) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const day = asNumber(value);
  if (!day || !monthByName[monthName]) return null;
  return `2026-${String(monthByName[monthName]).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Reads GrowUp's 2026 workbook by header position, supporting the layout shift
// between the first and second semester. It never writes to Supabase.
export async function readGrowUpWorkbook(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const rows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const values = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    const header = values[0] ?? [];
    const dateIndex = header.findIndex((value) => String(value ?? "").trim().toUpperCase() === "FECHA");
    const monthName = sheetName.split(" ")[0].toUpperCase();
    if (dateIndex < 0 || !monthByName[monthName]) return;

    values.slice(1).forEach((row, rowOffset) => {
      const date = sourceDate(row[dateIndex], monthName);
      const clientName = String(row[0] ?? "").trim();
      if (!date || !clientName) return;
      const saleTotal = asNumber(row[dateIndex + 7]);
      const deposit = asNumber(row[dateIndex + 8]);
      rows.push({
        source: { sheet: sheetName, row: rowOffset + 2 },
        clientName,
        date,
        seller: String(row[dateIndex + 1] ?? "").trim() || null,
        timeRange: String(row[dateIndex + 2] ?? "").trim() || null,
        location: String(row[dateIndex + 3] ?? "").trim() || null,
        locality: String(row[dateIndex + 4] ?? "").trim() || null,
        phone: row[dateIndex + 5] == null ? null : String(row[dateIndex + 5]).trim(),
        eventType: row[dateIndex + 6] == null ? null : String(row[dateIndex + 6]).trim(),
        saleTotal,
        deposit,
        balance: Math.max(saleTotal - deposit, 0),
        details: String(row[dateIndex + 10] ?? "").trim() || null,
        service: String(row[dateIndex + 11] ?? "").trim() || null,
      });
    });
  });
  return rows;
}
