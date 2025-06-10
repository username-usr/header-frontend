import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ExportIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor" />
  </svg>
);

function Export({ data, mergedCells, cellStyles, cellClassMap }) {
  const exportToXLSX = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Merged Title (as per your code, disabled)
    const colCount = data[0]?.length || 1;
    worksheet.mergeCells('A1:' + String.fromCharCode(65 + colCount - 1) + '1');
    const titleCell = worksheet.getCell('A1');
    // titleCell.value = 'Spreadsheet Data Export';
    titleCell.font = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    // titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };

    // Add data rows and apply styles
    data.forEach((row, rowIndex) => {
      const excelRow = worksheet.addRow(row.map(cell => (cell == null ? '' : cell.toString())));
      excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const cellKey = `${rowIndex},${colNumber - 1}`;
        const className = cellClassMap[cellKey];
        const style = className && cellStyles[className] ? cellStyles[className] : null;
        if (style) {
          cell.font = {
            name: style.font || 'Calibri',
            size: parseInt(style.size, 10) || 12,
            bold: style.bold === true,
            italic: style.italic === true,
            color: { argb: style.color ? 'FF' + style.color.replace('#', '') : 'FF000000' }
          };
          if (style.background && style.background !== 'transparent') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF' + style.background.replace('#', '') }
            };
          }
        }
        // No borders unless specified
        cell.border = {};
      });
    });

    // Apply merged cells
    mergedCells.forEach(merge => {
      const startRow = merge.row + 2; // Adjust for title (row 1)
      const endRow = merge.row + merge.rowspan - 1 + 2;
      const startCol = String.fromCharCode(65 + merge.col);
      const endCol = String.fromCharCode(65 + merge.col + merge.colspan - 1);
      try {
        if (startRow <= endRow && merge.col <= merge.col + merge.colspan - 1) {
          worksheet.mergeCells(`${startCol}${startRow}:${endCol}${endRow}`);
          const mergedCell = worksheet.getCell(`${startCol}${startRow}`);
          const cellKey = `${merge.row},${merge.col}`;
          const className = cellClassMap[cellKey];
          const style = className && cellStyles[className] ? cellStyles[className] : null;
          if (style) {
            mergedCell.font = {
              name: style.font || 'Calibri',
              size: parseInt(style.size, 10) || 12,
              bold: style.bold === true,
              italic: style.italic === true,
              color: { argb: style.color ? 'FF' + style.color.replace('#', '') : 'FF000000' }
            };
            if (style.background && style.background !== 'transparent') {
              mergedCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + style.background.replace('#', '') }
              };
            }
          }
          mergedCell.alignment = { vertical: 'middle', horizontal: 'center' };
          mergedCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      } catch (error) {
        console.error('Error merging cells:', merge, error);
      }
    });

    // Export the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, 'styled-spreadsheet.xlsx');
  };

  const exportToCSV = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Add data rows directly from grid
    data.forEach(row => {
      worksheet.addRow(row.map(cell => (cell == null ? '' : cell.toString())));
    });

    // Export to CSV buffer
    const csvBuffer = await workbook.csv.writeBuffer();
    const blob = new Blob([csvBuffer], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'spreadsheet.csv');
  };

  return (
    <div className="export-controls">
      <button
        className="format-button"
        onClick={exportToXLSX}
        title="Export to XLSX"
      >
        <ExportIcon /> XLSX
      </button>
      <button
        className="format-button"
        onClick={exportToCSV}
        title="Export to CSV (styles not supported)"
      >
        <ExportIcon /> CSV
      </button>
    </div>
  );
}

export default Export;