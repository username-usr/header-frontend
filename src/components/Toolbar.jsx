import React, { useState } from 'react';
import Export from './Export';

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

const MergeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h4v2H7v-2z" fill="currentColor" />
  </svg>
);

function Toolbar({
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
  fontColor,
  setFontColor,
  backgroundColor,
  setBackgroundColor,
  handleMergeToggle,
  data,
  mergedCells,
  cellStyles,
  cellClassMap // Add to props
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
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

      <div style={{ position: 'relative' }}>
        <button
          className="format-button"
          onClick={() => setIsExportOpen(!isExportOpen)}
          title="Export Options"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor" />
          </svg>
        </button>
        {isExportOpen && (
          <div style={{ position: 'absolute', top: '40px', right: '-100', zIndex: 1000 }}>
            <Export
              data={data}
              mergedCells={mergedCells}
              cellStyles={cellStyles}
              cellClassMap={cellClassMap} // Pass to Export
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Toolbar;