import { useRef, useEffect, useState } from 'react';
import Handsontable from 'handsontable/base';
import { HotTable } from '@handsontable/react-wrapper';
import { nanoid } from 'nanoid';
import Toolbar from './Toolbar';
import FxBar from './FxBar';
import AIModal from './AIModal';
import MergeCellButton from './MergeCellButton';
import Export from './Export';

function AppContent({
  hotRef,
  data,
  setData,
  dataRef,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  fontColor,
  setFontColor,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
  selectedCells,
  setSelectedCells,
  cellStyles,
  setCellStyles,
  currentCellRef,
  setCurrentCellRef,
  fxValue,
  setFxValue,
  isEditingFx,
  setIsEditingFx,
  isModalOpen,
  setIsModalOpen,
  aiInput,
  setAiInput,
  isLoading,
  setIsLoading,
  aiModel,
  setAiModel,
  backgroundColor,
  setBackgroundColor,
  isBackgroundPickerOpen,
  setIsBackgroundPickerOpen,
  backgroundButtonRef,
  mergedCells,
  setMergedCells,
  ensureGridExpanded,
  handleFxChange,
  handleFxKeyDown,
  handleFxSubmit,
  handleAiSubmit,
  handleAiKeyDown,
  handleMergeToggle,
  gridRef
}) {
  const [cellClassMap, setCellClassMap] = useState({});
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
  }, [ensureGridExpanded]);

  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || selectedCells.length === 0) return;

    hot.suspendRender();

    const updatedClassMap = {};
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
          updatedClassMap[`${r},${c}`] = uniqueClass; // Map cell (row,col) to class
        }
      }

      setCellStyles(prev => ({
        ...prev,
        ...updatedStyles
      }));
      setCellClassMap(prev => ({
        ...prev,
        ...updatedClassMap
      }));
    }
    hot.resumeRender();
    hot.render();
  }, [fontFamily, fontSize, fontColor, backgroundColor, isBold, isItalic, selectedCells, hotRef, setCellStyles]);

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

      setCurrentCellRef(getCellReference(row, col));
      const cellValue = hot.getDataAtCell(row, col) || '';
      setFxValue(cellValue);
      setIsEditingFx(false);

      const meta = hot.getCellMeta(row, col);
      const uniqueClass = (meta.className || '').split(' ').find(cls => cls.startsWith('cell-style-'));
      const style = uniqueClass ? cellStyles[uniqueClass] : null;

      setFontFamily(style?.font ?? 'arial');
      setFontSize(style?.size ?? '14');
      setFontColor(style?.color ?? '');
      setBackgroundColor(style?.background ?? '');
      setIsBold(style?.bold ?? false);
      setIsItalic(style?.italic ?? false);
    });

    const handleOutsideClick = (e) => {
      const tableEl = document.querySelector('.hot-container');
      const toolbarEl = document.querySelector('.toolbar');
      const modalEl = document.querySelector('.modal');
      const exportEl = document.querySelector('.export-controls');

      if (
        tableEl &&
        !tableEl.contains(e.target) &&
        toolbarEl &&
        !toolbarEl.contains(e.target) &&
        (!modalEl || !modalEl.contains(e.target)) &&
        (!exportEl || !exportEl.contains(e.target))
      ) {
        hot.deselectCell();
        setFontFamily('arial');
        setFontSize('14');
        setFontColor('');
        setBackgroundColor('');
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
  }, [cellStyles, setSelectedCells, setCurrentCellRef, setFxValue, setIsEditingFx, setFontFamily, setFontSize, setFontColor, setBackgroundColor, setIsBold, setIsItalic, setIsModalOpen, hotRef]);

  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.render();
    }
  }, [cellStyles, hotRef]);

  const getCellReference = (row, col) => {
    let colName = '';
    let colNum = col;
    while (colNum >= 0) {
      colName = String.fromCharCode(65 + (colNum % 26)) + colName;
      colNum = Math.floor(colNum / 26) - 1;
    }
    return colName + (row + 1);
  };

  return (
    <div>
      <div className="main-nav">
        <div className="nav-logo">HEADER\</div>
        <ul className="nav-menu">
          <li>About Us</li>
          <li>Products</li>
          <li>Developers</li>
          <li>Pricing</li>
        </ul>
      </div>
      <div className="herosection">
        <div className="hero-title">
          BUILD STUNNING, SMART<br />
          SPREADSHEETS WITH EASE<br />
          —START RIGHT NOW
        </div>
        <button className="hero-cta" onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          Try Now
        </button>
      </div>
      <div className="content">
        <div className="grid" ref={gridRef}></div>
        <div className="widget-bar">
          <div className="window-controls">
            <div className="window-control-dot red"></div>
            <div className="window-control-dot yellow"></div>
            <div className="window-control-dot green"></div>
          </div>
        </div>
        <div className="content-body">
          <div className="sidebar">
            <button
              className="format-button-modal"
              onClick={() => setIsModalOpen(true)}
              title="AI Assistant"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 2a10 10 0 0 0-7.35 16.65A10 10 0 0 0 12 22a10 10 0 0 0 7.35-3.35A10 10 0 0 0 22 12a10 10 0 0 0-3.35-7.35A10 10 0 0 0 12 2zm0 18a8 8 0 0 1-5.65-2.35A8 8 0 0 1 4 12a8 8 0 0 1 2.35-5.65A8 8 0 0 1 12 4a8 8 0 0 1 5.65 2.35A8 8 0 0 1 20 12a8 8 0 0 1-2.35 5.65A8 8 0 0 1 12 20zm-1-14h2v4h4v2h-4v4h-2v-4H7v-2h4V6z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div className="grid">
            <Toolbar
              fontFamily={fontFamily}
              setFontFamily={setFontFamily}
              fontSize={fontSize}
              setFontSize={setFontSize}
              isBold={isBold}
              setIsBold={setIsBold}
              isItalic={isItalic}
              setIsItalic={setIsItalic}
              fontColor={fontColor}
              setFontColor={setFontColor}
              backgroundColor={backgroundColor}
              setBackgroundColor={setBackgroundColor}
              handleMergeToggle={handleMergeToggle}
              data={data}
              mergedCells={mergedCells}
              cellStyles={cellStyles}
              cellClassMap={cellClassMap}
            />
            <FxBar
              fxValue={fxValue}
              handleFxChange={handleFxChange}
              handleFxKeyDown={handleFxKeyDown}
              handleFxSubmit={handleFxSubmit}
              isEditingFx={isEditingFx}
              setIsEditingFx={setIsEditingFx}
            />
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
                mergeCells={mergedCells}
              />
              <AIModal
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                aiInput={aiInput}
                setAiInput={setAiInput}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                aiModel={aiModel}
                setAiModel={setAiModel}
                handleAiSubmit={handleAiSubmit}
                handleAiKeyDown={handleAiKeyDown}
              />
            </div>
          </div>
        </div>
      </div>
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <div className="footer-logo">HEADER\</div>
            <p className="footer-description">
              Build stunning, smart spreadsheets with ease.
            </p>
          </div>
          <div className="footer-section">
            <h3>Company</h3>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#contact">Pricing</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Resources</h3>
            <ul>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#docs">Documentation</a></li>
              <li><a href="#support">Support</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-copyright">
          © 2025 HEADER\. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default AppContent;