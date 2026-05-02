import * as XLSX from "xlsx";

export function exportToXlsx(
  rows: Record<string, any>[],
  fileName: string,
  sheetName = "Sheet1"
) {
  if (!rows || rows.length === 0) {
    rows = [{ "No data": "" }];
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${fileName}-${stamp}.xlsx`);
}