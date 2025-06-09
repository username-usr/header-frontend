import { useRef, useState } from 'react';
import './App.css';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import Handsontable from 'handsontable/base';
import { registerAllModules } from 'handsontable/registry';
import { nanoid } from 'nanoid';
import AppContent from './components/AppContent';

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
    } else {
      // If not merged, merge
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
    }
  };

  return (
    <AppContent
      hotRef={hotRef}
      data={data}
      setData={setData}
      dataRef={dataRef}
      fontFamily={fontFamily}
      setFontFamily={setFontFamily}
      fontSize={fontSize}
      setFontSize={setFontSize}
      fontColor={fontColor}
      setFontColor={setFontColor}
      isBold={isBold}
      setIsBold={setIsBold}
      isItalic={isItalic}
      setIsItalic={setIsItalic}
      selectedCells={selectedCells}
      setSelectedCells={setSelectedCells}
      cellStyles={cellStyles}
      setCellStyles={setCellStyles}
      currentCellRef={currentCellRef}
      setCurrentCellRef={setCurrentCellRef}
      fxValue={fxValue}
      setFxValue={setFxValue}
      isEditingFx={isEditingFx}
      setIsEditingFx={setIsEditingFx}
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
      aiInput={aiInput}
      setAiInput={setAiInput}
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      aiModel={aiModel}
      setAiModel={setAiModel}
      backgroundColor={backgroundColor}
      setBackgroundColor={setBackgroundColor}
      isBackgroundPickerOpen={isBackgroundPickerOpen}
      setIsBackgroundPickerOpen={setIsBackgroundPickerOpen}
      backgroundButtonRef={backgroundButtonRef}
      mergedCells={mergedCells}
      setMergedCells={setMergedCells}
      ensureGridExpanded={ensureGridExpanded}
      handleFxChange={handleFxChange}
      handleFxKeyDown={handleFxKeyDown}
      handleFxSubmit={handleFxSubmit}
      handleAiSubmit={handleAiSubmit}
      handleAiKeyDown={handleAiKeyDown}
      handleMergeToggle={handleMergeToggle}
    />
  );
}

export default App;