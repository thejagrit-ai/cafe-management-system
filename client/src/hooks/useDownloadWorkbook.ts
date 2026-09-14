import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

type WorkbookCell = string | number | boolean | null | undefined;

interface DownloadWorkbookOptions {
  filename: string;
  sheetName?: string;
  headers: string[];
  rows: WorkbookCell[][];
}

const MAX_COLUMN_WIDTH = 42;
const MIN_COLUMN_WIDTH = 10;

function cellWidth(value: WorkbookCell): number {
  if (value === null || value === undefined) return MIN_COLUMN_WIDTH;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, String(value).length + 2));
}

export function useDownloadWorkbook() {
  const [isExporting, setIsExporting] = useState(false);

  const downloadWorkbook = useCallback(({ filename, sheetName = 'Report', headers, rows }: DownloadWorkbookOptions) => {
    try {
      setIsExporting(true);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      worksheet['!cols'] = headers.map((header, columnIndex) => ({
        wch: Math.max(cellWidth(header), ...rows.map((row) => cellWidth(row[columnIndex]))),
      }));
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

      const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      XLSX.writeFile(workbook, fullFilename, { compression: true });
      toast.success(`Excel "${fullFilename}" downloaded`);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to generate Excel file');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { downloadWorkbook, isExporting };
}
