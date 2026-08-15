import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface DownloadCSVOptions {
  filename: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

export function useDownloadCSV() {
  const [isExporting, setIsExporting] = useState(false);

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const downloadCSV = useCallback(({ filename, headers, rows }: DownloadCSVOptions) => {
    try {
      setIsExporting(true);

      const headerLine = headers.map(escapeCell).join(',');
      const bodyLines = rows.map((row) => row.map(escapeCell).join(','));

      // Prepend UTF-8 Byte Order Mark (\uFEFF) for native Excel UTF-8 display
      const csvContent = '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const fullFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fullFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link)
      URL.revokeObjectURL(url);

      toast.success(`Archivo "${fullFilename}" descargado exitosamente`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar archivo CSV');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { downloadCSV, isExporting };
}
