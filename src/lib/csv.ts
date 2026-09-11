// Exportação de relatórios em CSV (ex.: pagamento aos colaboradores em /agency/payments).
// Gerado 100% no cliente a partir dos dados já carregados na tela — sem rota nova no backend.

/** Escapa um valor para uma célula CSV (aspas duplas quando tem vírgula/aspas/quebra de linha). */
function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Monta o texto CSV (separador ";", padrão Excel BR) a partir de cabeçalho + linhas. */
export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(";"));
  return lines.join("\r\n");
}

/** Dispara o download de um CSV no navegador (BOM UTF-8 para acentuação abrir certa no Excel). */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
