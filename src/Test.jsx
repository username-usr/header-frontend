import { useRef, useEffect, useState } from 'react';
import './App.css';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import Handsontable from 'handsontable/base';
import { registerAllModules } from 'handsontable/registry';
import { HotTable } from '@handsontable/react-wrapper';
import { nanoid } from 'nanoid';
import MergeCellButton from './mergeCell';

registerAllModules();

// Define default font, font size, and font color
const DEFAULT_FONT_FAMILY = 'arial';
const DEFAULT_FONT_SIZE = '14';
const DEFAULT_FONT_COLOR = ''; // Default to white for dark theme
const DEFAULT_BACKGROUND_COLOR = ''; // Match grid 
const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://header-backend-production.up.railway.app'
  : 'http://localhost:8000';

function App() {
  const hotRef = useRef(null);
  const dataRef = useRef();
  const [data, setData] = useState(
    Array.from({ length: 30 }, () => Array(30).fill(''))
  );
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [fontColor, setFontColor] = useState(DEFAULT_FONT_COLOR);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [selectedCells, setSelectedCells] = useState([]);
  const [cellStyles, setCellStyles] = useState({});
  const [currentCellRef, setCurrentCellRef] = useState('');
  const [fxValue, setFxValue] = useState('');
  const [isEditingFx, setIsEditingFx] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiModel, setAiModel] = useState('mistralai/devstral-small:free');
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND_COLOR);
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const backgroundButtonRef = useRef(null);
  const [mergedCells, setMergedCells] = useState([]);

  dataRef.current = data;

  // Helper function to convert row/col to cell reference (A1, B2, etc.)
  const getCellReference = (row, col) => {
    let colName = '';
    let colNum = col;
    while (colNum >= 0) {
      colName = String.fromCharCode(65 + (colNum % 26)) + colName;
      colNum = Math.floor(colNum / 26) - 1;
    }
    return colName + (row + 1);
  };

  // Helper function to convert cell reference (A1, B2, etc.) to row/col
  const parseCellReference = (cellRef) => {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const colStr = match[1];
    const rowNum = parseInt(match[2]) - 1;

    let colNum = 0;
    for (let i = 0; i < colStr.length; i++) {
      colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
    }
    colNum -= 1;

    return [rowNum, colNum];
  };

  // Convert backend cell coordinate format (c1r1) to row/col
  const parseBackendCellRef = (cellRef) => {
    const match = cellRef.match(/^c(\d+)r(\d+)$/);
    if (!match) return null;

    const col = parseInt(match[1]) - 1; // Convert to 0-based
    const row = parseInt(match[2]) - 1; // Convert to 0-based

    return [row, col];
  };

  // Handle fx bar input changes
  const handleFxChange = (e) => {
    setFxValue(e.target.value);
  };

  // Handle fx bar enter key or blur
  const handleFxSubmit = () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || selectedCells.length === 0) return;

    const [row, col] = selectedCells[0];
    hot.setDataAtCell(row, col, fxValue);
    setIsEditingFx(false);
  };

  // Handle fx bar key events
  const handleFxKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFxSubmit();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      // Reset to original value and exit edit mode
      const hot = hotRef.current?.hotInstance;
      if (hot && selectedCells.length > 0) {
        const [row, col] = selectedCells[0];
        const cellValue = hot.getDataAtCell(row, col) || '';
        setFxValue(cellValue);
      }
      setIsEditingFx(false);
    }
  };

  const ensureGridExpanded = (addRows, addCols) => {
    let newData = [...dataRef.current];
    if (addCols > 0) {
      newData = newData.map(row => [...row, ...Array(addCols).fill('')]);
    }
    if (addRows > 0) {
      const rowLength = newData[0].length;
      for (let i = 0; i < addRows; i++) {
        newData.push(Array(rowLength).fill(''));
      }
    }
    setData(newData);
  };

  // AI Submit Handler - This is where the magic happens!
  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;

    setIsLoading(true);

    try {
      console.log('🚀 Sending AI request:', aiInput);

      const response = await fetch(`${BACKEND_URL}/generate-cellmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiInput,
          model: aiModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate cellmap');
      }

      const cellMap = await response.json();
      console.log('✅ Received cellmap from backend:', cellMap);

      // Apply the cellmap to the spreadsheet
      const hot = hotRef.current?.hotInstance;
      if (!hot) {
        throw new Error('Spreadsheet not initialized');
      }

      // Prepare updates array for batch operation
      const updates = [];
      let maxRow = 0;
      let maxCol = 0;

      // Process each cell from the backend response
      Object.entries(cellMap).forEach(([cellRef, value]) => {
        const coords = parseBackendCellRef(cellRef);
        if (coords) {
          const [row, col] = coords;
          updates.push([row, col, value]);
          maxRow = Math.max(maxRow, row);
          maxCol = Math.max(maxCol, col);
        } else {
          console.warn('⚠️ Could not parse cell reference:', cellRef);
        }
      });

      // Ensure grid is large enough
      const currentRows = data.length;
      const currentCols = data[0].length;
      const needRows = Math.max(0, (maxRow + 1) - currentRows);
      const needCols = Math.max(0, (maxCol + 1) - currentCols);

      if (needRows > 0 || needCols > 0) {
        ensureGridExpanded(needRows, needCols);
        // Wait a bit for the grid to expand
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Apply all updates at once
      if (updates.length > 0) {
        hot.setDataAtCell(updates);
        console.log(`✅ Applied ${updates.length} cell updates to spreadsheet`);
      }

      // Clear input and close modal
      setAiInput('');
      setIsModalOpen(false);

    } catch (error) {
      console.error('❌ Error calling AI backend:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key in AI input
  const handleAiKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAiSubmit();
      e.preventDefault();
    }
  };

  const handleMergeClick = () => {
    // Validate Handsontable instance
    const hot = hotRef?.current?.hotInstance;
    if (!hot) {
      console.warn('No Handsontable instance found.');
      return;
    }

    // Get the last selected range
    const selected = hot.getSelectedRangeLast();
    if (!selected) {
      console.warn('No selection found. Please select a range of cells to merge.');
      return;
    }

    const { from, to } = selected;
    // Determine top-left corner and dimensions of the merge
    const row = Math.min(from.row, to.row);
    const col = Math.min(from.col, to.col);
    const rowspan = Math.abs(to.row - from.row) + 1;
    const colspan = Math.abs(to.col - from.col) + 1;

    console.log('📦 Selected range:', { row, col, rowspan, colspan });

    // Prevent merging a single cell
    if (rowspan === 1 && colspan === 1) {
      console.warn('⚠️ Merge ignored: selection is a single cell.');
      return;
    }

    const newMerge = { row, col, rowspan, colspan };

    // Check for overlapping or duplicate merges
    const isOverlapping = mergedCells.some((m) => {
      const rowEnd = m.row + m.rowspan - 1;
      const colEnd = m.col + m.colspan - 1;
      const newRowEnd = newMerge.row + newMerge.rowspan - 1;
      const newColEnd = newMerge.col + newMerge.colspan - 1;

      return (
        m.row <= newRowEnd &&
        rowEnd >= newMerge.row &&
        m.col <= newColEnd &&
        colEnd >= newMerge.col
      );
    });

    if (isOverlapping) {
      console.warn('⛔ This region overlaps with an existing merge.');
      return;
    }

    try {
      // Update the mergedCells state with the new merge
      const updatedMerges = [...mergedCells, newMerge];
      setMergedCells(updatedMerges);

      // Apply the merge by updating Handsontable settings
      hot.updateSettings({
        mergeCells: updatedMerges
      });

      // Force re-render to reflect changes
      hot.render();
      console.log('✅ Cells merged successfully:', newMerge);
    } catch (error) {
      console.error('❌ Error during merge:', error);
    }
  };

  // Unmerge logic for selected merged cells
  const handleUnmergeClick = () => {
    // Validate Handsontable instance
    const hot = hotRef?.current?.hotInstance;
    if (!hot) {
      console.warn('No Handsontable instance found.');
      return;
    }

    // Get the last selected range
    const selected = hot.getSelectedRangeLast();
    if (!selected) {
      console.warn('No selection found. Please select a merged cell to unmerge.');
      return;
    }

    const { from, to } = selected;
    const row = Math.min(from.row, to.row);
    const col = Math.min(from.col, to.col);

    // Find if the selected cell is part of a merged region
    const mergeToRemove = mergedCells.find((m) => {
      const rowEnd = m.row + m.rowspan - 1;
      const colEnd = m.col + m.colspan - 1;
      return (
        row >= m.row &&
        row <= rowEnd &&
        col >= m.col &&
        col <= colEnd
      );
    });

    if (!mergeToRemove) {
      console.warn('⚠️ No merged cell found at this selection.');
      return;
    }

    try {
      // Remove the merged region from the state
      const updatedMerges = mergedCells.filter(
        (m) => !(m.row === mergeToRemove.row && m.col === mergeToRemove.col && m.rowspan === mergeToRemove.rowspan && m.colspan === mergeToRemove.colspan)
      );
      setMergedCells(updatedMerges);

      // Update Handsontable settings to reflect unmerge
      hot.updateSettings({
        mergeCells: updatedMerges
      });

      // Force re-render to reflect changes
      hot.render();
      console.log('✅ Cells unmerged successfully:', mergeToRemove);
    } catch (error) {
      console.error('❌ Error during unmerge:', error);
    }
  };

  // Toggle merge/unmerge based on selection
  const handleMergeToggle = () => {
    const hot = hotRef?.current?.hotInstance;
    if (!hot) {
      console.warn('No Handsontable instance found.');
      return;
    }

    const selected = hot.getSelectedRangeLast();
    if (!selected) {
      console.warn('No selection found.');
      return;
    }

    const { from, to } = selected;
    const row = Math.min(from.row, to.row);
    const col = Math.min(from.col, to.col);
    const rowspan = Math.abs(to.row - from.row) + 1;
    const colspan = Math.abs(to.col - from.col) + 1;

    // Check if the selection is already part of a merged region
    const isMerged = mergedCells.find((m) => {
      const rowEnd = m.row + m.rowspan - 1;
      const colEnd = m.col + m.colspan - 1;
      return (
        row >= m.row &&
        row <= rowEnd &&
        col >= m.col &&
        col <= colEnd
      );
    });

    if (isMerged) {
      // If already merged, unmerge
      handleUnmergeClick();
    } else {
      // If not merged, merge
      handleMergeClick();
    }
  };

  useEffect(() => {
    let holder = null;
    const handleScroll = () => {
      if (!holder) return;
      const scrollLeft = holder.scrollLeft;
      const scrollTop = holder.scrollTop;
      const maxScrollLeft = holder.scrollWidth - holder.clientWidth;
      const maxScrollTop = holder.scrollHeight - holder.clientHeight;
      const horizontalPos = maxScrollLeft > 0 ? Math.min(10, Math.ceil((scrollLeft / maxScrollLeft) * 10)) : 1;
      const verticalPos = maxScrollTop > 0 ? Math.min(10, Math.ceil((scrollTop / maxScrollTop) * 10)) : 1;
      if (horizontalPos === 10) ensureGridExpanded(0, 3);
      if (verticalPos === 10) ensureGridExpanded(3, 0);
    };
    const interval = setInterval(() => {
      holder = document.querySelector('.wtHolder');
      if (holder) {
        holder.addEventListener('scroll', handleScroll, { passive: true });
        clearInterval(interval);
      }
    }, 200);
    return () => {
      if (holder) holder.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || selectedCells.length === 0) return;

    hot.suspendRender();

    for (let index = 0; index < selectedCells.length; index++) {
      const [row1, col1, row2, col2] = selectedCells[index];
      const startRow = Math.max(Math.min(row1, row2), 0);
      const endRow = Math.max(row1, row2);
      const startCol = Math.max(Math.min(col1, col2), 0);
      const endCol = Math.max(col1, col2);

      const updatedStyles = {};

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          let className = hot.getCellMeta(r, c).className || '';
          let uniqueClass = className.split(' ').find(cls => cls.startsWith('cell-style-'));

          if (!uniqueClass) {
            uniqueClass = `cell-style-${nanoid(6)}`;
            className = `${className} ${uniqueClass}`.trim();
            hot.setCellMeta(r, c, 'className', className);
          }

          updatedStyles[uniqueClass] = {
            font: fontFamily,
            size: fontSize,
            bold: isBold,
            italic: isItalic,
            color: fontColor,
            background: backgroundColor
          };
        }
      }

      setCellStyles(prev => ({
        ...prev,
        ...updatedStyles
      }));
    }
    hot.resumeRender();
    hot.render();
  }, [fontFamily, fontSize, fontColor, backgroundColor, isBold, isItalic, selectedCells]);

  useEffect(() => {
    let styleTag = document.getElementById('dynamic-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-styles';
      document.head.appendChild(styleTag);
    }

    const rules = Object.entries(cellStyles).map(([cls, style]) => {
      const font = style.font;
      const size = parseInt(style.size, 10);
      const fontWeight = style.bold ? 'bold' : 'normal';
      const fontStyle = style.italic ? 'italic' : 'normal';
      const fontColor = style.color;
      const backgroundColor = style.background;

      const cssRule = `td.${cls} { 
        font-family: ${font}; 
        font-size: ${size}px !important; 
        font-weight: ${fontWeight} !important;
        font-style: ${fontStyle} !important;
        color: ${fontColor} !important;
        background-color: ${backgroundColor} !important;
      }`;
      return cssRule;
    });

    styleTag.innerHTML = rules.join('\n');
  }, [cellStyles]);

  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    hot.addHook('afterSelection', (row, col, row2, col2) => {
      setSelectedCells([[row, col, row2, col2]]);

      // Update cell reference and fx value
      setCurrentCellRef(getCellReference(row, col));
      const cellValue = hot.getDataAtCell(row, col) || '';
      setFxValue(cellValue);
      setIsEditingFx(false);

      const meta = hot.getCellMeta(row, col);
      const uniqueClass = (meta.className || '').split(' ').find(cls => cls.startsWith('cell-style-'));
      const style = uniqueClass ? cellStyles[uniqueClass] : null;

      // Reset to default if no style is applied to the cell
      setFontFamily(style?.font ?? DEFAULT_FONT_FAMILY);
      setFontSize(style?.size ?? DEFAULT_FONT_SIZE);
      setFontColor(style?.color ?? DEFAULT_FONT_COLOR);
      setBackgroundColor(style?.background ?? DEFAULT_BACKGROUND_COLOR);
      setIsBold(style?.bold ?? false);
      setIsItalic(style?.italic ?? false);
    });

    const handleOutsideClick = (e) => {
      const tableEl = document.querySelector('.hot-container');
      const toolbarEl = document.querySelector('.toolbar');
      const modalEl = document.querySelector('.modal');

      if (
        tableEl &&
        !tableEl.contains(e.target) &&
        toolbarEl &&
        !toolbarEl.contains(e.target) &&
        (!modalEl || !modalEl.contains(e.target))
      ) {
        hot.deselectCell();
        // Reset toolbar to defaults on deselection
        setFontFamily(DEFAULT_FONT_FAMILY);
        setFontSize(DEFAULT_FONT_SIZE);
        setFontColor(DEFAULT_FONT_COLOR);
        setBackgroundColor(DEFAULT_BACKGROUND_COLOR);
        setIsBold(false);
        setIsItalic(false);
        setCurrentCellRef('');
        setFxValue('');
        setIsEditingFx(false);
        setIsModalOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [cellStyles]);

  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.render();
    }
  }, [cellStyles]);

  const BoldIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" fill="currentColor" />
    </svg>
  );

  const ItalicIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z" fill="currentColor" />
    </svg>
  );

  const ColorIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm1.5 4c-.83 0-1.5-.67-1.5-1.5S15.67 9 16.5 9s1.5.67 1.5 1.5S17.33 12 16.5 12z" fill="currentColor" />
    </svg>
  );

  const BackgroundColorIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z" fill="currentColor" />
    </svg>
  );

  const AIIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M12 2a10 10 0 0 0-7.35 16.65A10 10 0 0 0 12 22a10 10 0 0 0 7.35-3.35A10 10 0 0 0 22 12a10 10 0 0 0-3.35-7.35A10 10 0 0 0 12 2zm0 18a8 8 0 0 1-5.65-2.35A8 8 0 0 1 4 12a8 8 0 0 1 2.35-5.65A8 8 0 0 1 12 4a8 8 0 0 1 5.65 2.35A8 8 0 0 1 20 12a8 8 0 0 1-2.35 5.65A8 8 0 0 1 12 20zm-1-14h2v4h4v2h-4v4h-2v-4H7v-2h4V6z" fill="currentColor" />
    </svg>
  );

  const CancelIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" fill="currentColor" />
    </svg>
  );

  const SendIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
    </svg>
  );

  const LoadingIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" className="spinning">
      <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25" fill="currentColor" />
      <path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" fill="currentColor" />
    </svg>
  );

  const MergeIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h4v2H7v-2z" fill="currentColor" />
    </svg>
  );

  return (
    <div>
      <div className="main-nav">📋📋</div>
      <div className="herosection">Hero Section (Gap)</div>
      <div className="content">
        <div className="sidebar">
          <button
            className="format-button-modal"
            onClick={() => setIsModalOpen(true)}
            title="AI Assistant"
          >
            <AIIcon />
          </button>
        </div>
        <div className="grid">
          <div className="toolbar">
            <select className='font-select' value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              <option value="arial">Arial</option>
              <option value="times">Times New Roman</option>
              <option value="courier">Courier New</option>
              <option value="verdana">Verdana</option>
            </select>

            <select className='font-size-select' value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
              <option value="10">10</option>
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="24">24</option>
            </select>

            <button
              className={`format-button ${isBold ? 'active' : ''}`}
              onClick={() => setIsBold(!isBold)}
              title="Bold"
            >
              <BoldIcon />
            </button>

            <button
              className={`format-button ${isItalic ? 'active' : ''}`}
              onClick={() => setIsItalic(!isItalic)}
              title="Italic"
            >
              <ItalicIcon />
            </button>

            <button
              className="format-button"
              onClick={(event) => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = fontColor;
                input.style.position = 'absolute';
                input.style.left = `${event.currentTarget.offsetLeft}px`;
                input.style.top = `${event.currentTarget.offsetTop + event.currentTarget.offsetHeight}px`;
                input.style.opacity = '0';
                input.style.width = '0px';
                input.style.height = '0px';
                input.onchange = (e) => {
                  setFontColor(e.target.value);
                  document.body.removeChild(input);
                };
                document.body.appendChild(input);
                input.click();
              }}
              title="Font Color"
            >
              <ColorIcon />
            </button>

            <button
              className="format-button"
              onClick={(event) => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = backgroundColor;
                input.style.position = 'absolute';
                input.style.left = `${event.currentTarget.offsetLeft}px`;
                input.style.top = `${event.currentTarget.offsetTop + event.currentTarget.offsetHeight}px`;
                input.style.opacity = '0';
                input.style.width = '0px';
                input.style.height = '0px';
                input.onchange = (e) => {
                  setBackgroundColor(e.target.value);
                  document.body.removeChild(input);
                };
                document.body.appendChild(input);
                input.click();
              }}
              title="Background Color"
            >
              <BackgroundColorIcon />
            </button>
            <button
              className="format-button"
              onClick={handleMergeToggle}
              title="Merge Selected Cells"
            >
              <MergeIcon />
            </button>
          </div>

          <div className="fxbar">
            <span className="fx-label">fx</span>
            <input
              className="fx-input"
              type="text"
              value={fxValue}
              onChange={handleFxChange}
              onKeyDown={handleFxKeyDown}
              onBlur={(e) => {
                if (isEditingFx && !e.relatedTarget?.closest('.fxbar')) {
                  handleFxSubmit();
                }
              }}
              onFocus={() => setIsEditingFx(true)}
              placeholder="Enter formula or value"
            />
          </div>

          <div className="ht-theme-main-dark hot-container" style={{ height: '600px', position: 'relative' }}>
            <HotTable
              ref={hotRef}
              data={data}
              rowHeaders={true}
              colHeaders={true}
              licenseKey="non-commercial-and-evaluation"
              outsideClickDeselects={false}
              width="100%"
              height="100%"
              stretchH="all"
              manualColumnResize={true}
              manualRowResize={true}
              contextMenu={true}
              mergeCells={mergedCells} // Enable and configure merging
            />

            {isModalOpen && (
              <div className="modal">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>AI Assistant</h3>
                    <button
                      className="modal-cancel-button"
                      onClick={() => setIsModalOpen(false)}
                      title="Cancel"
                      disabled={isLoading}
                    >
                      <CancelIcon />
                    </button>
                  </div>
                  <p>Describe what data you want in your spreadsheet:</p>

                  <div className="ai-model-select" style={{ marginBottom: '10px' }}>
                    <label htmlFor="model-select">Model: </label>
                    <select
                      id="model-select"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      disabled={isLoading}
                    >
                      <option value="mistralai/devstral-small:free">Mistral Devstral (Free)</option>
                      <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="openai/gpt-4">GPT-4</option>
                      <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                    </select>
                  </div>

                  <div className="ai-input-container">
                    <input
                      className="fx-input ai-input"
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={handleAiKeyDown}
                      placeholder="e.g., 'Create a budget table' or 'Make a student grade tracker'"
                      disabled={isLoading}
                    />
                    <button
                      className="format-button send-button"
                      onClick={handleAiSubmit}
                      title={isLoading ? "Generating..." : "Send"}
                      disabled={isLoading || !aiInput.trim()}
                    >
                      {isLoading ? <LoadingIcon /> : <SendIcon />}
                    </button>
                  </div>

                  {isLoading && (
                    <div className="loading-message" style={{ marginTop: '10px', color: '#666' }}>
                      Generating your spreadsheet... This may take a few seconds.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;