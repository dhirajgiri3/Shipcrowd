/**
 * PDF Export Service
 * 
 * Generates PDF reports using pdfkit.
 */

import PDFDocument from 'pdfkit';
import logger from '../../logger/winston.logger.js';

export interface PDFColumn {
    header: string;
    key: string;
    width: number;
}

export interface PDFExportOptions {
    title?: string;
    subtitle?: string;
    orientation?: 'portrait' | 'landscape';
}

export default class PDFExportService {
    /**
     * Export data to PDF buffer
     */
    static async exportToPDF(
        data: any[],
        columns: PDFColumn[],
        options: PDFExportOptions = {}
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const chunks: Buffer[] = [];
                const doc = new PDFDocument({
                    size: 'A4',
                    layout: options.orientation || 'portrait',
                    margin: 50
                });

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                if (options.title) {
                    doc.fontSize(20).font('Helvetica-Bold').text(options.title, { align: 'center' });
                    doc.moveDown(0.5);
                }

                if (options.subtitle) {
                    doc.fontSize(12).font('Helvetica').text(options.subtitle, { align: 'center' });
                    doc.moveDown(0.5);
                }

                // Report metadata
                doc.fontSize(10)
                    .font('Helvetica')
                    .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
                doc.moveDown(1);

                // Calculate table dimensions
                const pageWidth = doc.page.width - 100;
                const startX = 50;
                let currentY = doc.y;

                // Draw table header
                doc.font('Helvetica-Bold').fontSize(9);
                let currentX = startX;

                // Header background
                doc.rect(startX, currentY, pageWidth, 20).fill('#4472C4');

                columns.forEach(col => {
                    const colWidth = (col.width / 100) * pageWidth;
                    doc.fillColor('white')
                        .text(col.header, currentX + 5, currentY + 5, {
                            width: colWidth - 10,
                            align: 'left'
                        });
                    currentX += colWidth;
                });

                currentY += 25;
                doc.fillColor('black');

                // Draw data rows
                doc.font('Helvetica').fontSize(8);
                let rowIndex = 0;

                data.forEach((row, index) => {
                    // Check for page break
                    if (currentY > doc.page.height - 80) {
                        doc.addPage();
                        currentY = 50;
                    }

                    // Alternate row background
                    if (index % 2 === 0) {
                        doc.rect(startX, currentY, pageWidth, 18).fill('#F5F5F5');
                    }

                    currentX = startX;
                    doc.fillColor('black');

                    columns.forEach(col => {
                        const colWidth = (col.width / 100) * pageWidth;
                        let value = row[col.key];

                        if (value === null || value === undefined) {
                            value = '';
                        } else if (value instanceof Date) {
                            value = value.toLocaleDateString();
                        } else if (typeof value === 'number') {
                            value = value.toLocaleString();
                        }

                        doc.text(String(value), currentX + 5, currentY + 4, {
                            width: colWidth - 10,
                            align: 'left',
                            lineBreak: false
                        });
                        currentX += colWidth;
                    });

                    currentY += 18;
                    rowIndex++;
                });

                // Footer
                doc.fontSize(8)
                    .text(`Total Records: ${data.length}`, 50, doc.page.height - 50, { align: 'left' });

                doc.end();
            } catch (error) {
                logger.error('Error generating PDF:', error);
                reject(error);
            }
        });
    }

    /**
     * Get standard column definitions with widths as percentages
     */
    static getOrderColumns(): PDFColumn[] {
        return [
            { header: 'Order #', key: 'orderNumber', width: 15 },
            { header: 'Customer', key: 'customerName', width: 25 },
            { header: 'Status', key: 'currentStatus', width: 15 },
            { header: 'Payment', key: 'paymentMethod', width: 15 },
            { header: 'Total', key: 'total', width: 15 },
            { header: 'Date', key: 'createdAt', width: 15 }
        ];
    }
}
