export type CsvCell = string | number | boolean | null | undefined | Date;

export interface CsvDownloadPayload {
    filename: string;
    header: string[];
    rows: CsvCell[][];
}

export function escapeCsvCell(value: CsvCell): string {
    if (value instanceof Date) {
        return `"${value.toISOString()}"`;
    }
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function buildCsvContent(header: string[], rows: CsvCell[][]): string {
    return [header.join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))].join('\n');
}

export function downloadCsv({ filename, header, rows }: CsvDownloadPayload): void {
    const csv = buildCsvContent(header, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
