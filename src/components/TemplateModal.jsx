import React, { useState } from 'react';
import { nanoid } from 'nanoid';

function TemplateModal({
  isTemplateModalOpen,
  setIsTemplateModalOpen,
  hotRef,
  setData,
  setMergedCells,
  setCellStyles,
  setCellClassMap,
  data, // Added to access existing grid data
}) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isTemplateModalOpen) return null;

  const applyTemplate = (templateId) => {
    if (templateId !== 'academic_calendar') return;

    const hot = hotRef.current?.hotInstance;
    if (!hot) {
      console.error('❌ Handsontable instance not found');
      return;
    }

    hot.suspendRender();

    // Template data for August 2024
    const templateData = [
      ['Date', 'Days', 'UG-S3,S5,S7 PG-S3', 'UG-S1, PG-S1', 'Events', 'Remarks'], // Header row
      ['1-Aug', 'Thu', '13', '6', '', ''],
      ['2-Aug', 'Fri', '14', '7', '', ''],
      ['3-Aug', 'Sat', '15', '8', 'Monday Timetable', '1st Sat'],
      ['4-Aug', 'Sun', 'H', 'H', 'Holiday', ''],
      ['5-Aug', 'Mon', '16', '9', '', ''],
      ['6-Aug', 'Tue', '17', '10', '', ''],
      ['7-Aug', 'Wed', '18', '11', '', ''],
      ['8-Aug', 'Thu', '19', '12', '', ''],
      ['9-Aug', 'Fri', '20', '13', '', ''],
      ['10-Aug', 'Sat', '21', '14', 'Friday Timetable', '2nd Sat'],
      ['11-Aug', 'Sun', 'H', 'H', 'Holiday', ''],
      ['12-Aug', 'Mon', '22', '15', '', ''],
      ['13-Aug', 'Tue', '23', '16', '', ''],
      ['14-Aug', 'Wed', '24', '17', '', ''],
      ['15-Aug', 'Thu', 'H', 'H', 'Independence Day', 'Holiday'],
      ['16-Aug', 'Fri', 'H', 'H', 'Varamahalakshmi Vratam', 'Holiday'],
      ['17-Aug', 'Sat', 'H', 'H', 'Holiday', '3rd Sat'],
      ['18-Aug', 'Sun', 'H', 'H', 'Holiday', ''],
      ['19-Aug', 'Mon', '25', '18', '', ''],
      ['20-Aug', 'Tue', '26', '19', '', ''],
      ['21-Aug', 'Wed', '27', '20', '', ''],
      ['22-Aug', 'Thu', '28', '21', '', ''],
      ['23-Aug', 'Fri', '29', '22', '', ''],
      ['24-Aug', 'Sat', 'H', 'H', 'Holiday', '4th Sat'],
      ['25-Aug', 'Sun', 'H', 'H', 'Holiday', ''],
      ['26-Aug', 'Mon', 'H', 'H', 'Sree Krishna Janmashtami', 'Holiday'],
      ['27-Aug', 'Tue', '30', '23', 'First Class Committee Meeting for UG-S1 and PG-S1', ''],
      ['28-Aug', 'Wed', '31', '24', '', ''],
      ['29-Aug', 'Thu', '32', '25', '', ''],
      ['30-Aug', 'Fri', '33', '26', '', ''],
      ['31-Aug', 'Sat', '34', '27', 'Thursday Timetable', '5th Sat'],
    ];

    // Create a deep copy of the existing grid data
    const currentData = data.map(row => [...row]);

    // Determine the required grid size
    const templateRows = templateData.length;
    const templateCols = templateData[0].length;
    const currentRows = currentData.length;
    const currentCols = currentData[0].length;

    // Expand grid if necessary to accommodate template data
    const neededRows = Math.max(0, templateRows - currentRows);
    const neededCols = Math.max(0, templateCols - currentCols);

    if (neededRows > 0) {
      for (let i = 0; i < neededRows; i++) {
        currentData.push(Array(currentCols).fill(''));
      }
    }
    if (neededCols > 0) {
      currentData.forEach(row => row.push(...Array(neededCols).fill('')));
    }

    // Insert template data into the top-left corner of the grid
    for (let r = 0; r < templateRows; r++) {
      for (let c = 0; c < templateCols; c++) {
        currentData[r][c] = templateData[r][c];
      }
    }

    // Merged cells: columns 5 and 6 (0-based: 4 and 5) unless two events
    const newMergedCells = [];
    for (let i = 1; i < templateData.length; i++) {
      const row = templateData[i];
      const event = row[4];
      const remark = row[5];
      if (event && !remark) {
        newMergedCells.push({ row: i, col: 4, rowspan: 1, colspan: 2 });
      }
    }

    // Styles for headers and cells
    const updatedStyles = {};
    const updatedCellClassMap = {};
    const headerClass = `cell-style-${nanoid(6)}`;
    updatedStyles[headerClass] = {
      font: 'Arial',
      size: '14',
      bold: true,
      color: '#000000',
      background: '#F0F0F0',
      alignment: 'center',
    };
    // Apply header styles
    for (let c = 0; c < templateCols; c++) {
      const key = `0,${c}`;
      updatedCellClassMap[key] = headerClass;
      hot.setCellMeta(0, c, 'className', headerClass);
    }

    // Apply centered text for all template cells
    const cellClass = `cell-style-${nanoid(6)}`;
    updatedStyles[cellClass] = {
      font: 'Arial',
      size: '12',
      bold: false,
      color: '#000000',
      background: '#FFFFFF',
      alignment: 'center',
    };
    for (let r = 1; r < templateRows; r++) {
      for (let c = 0; c < templateCols; c++) {
        const key = `${r},${c}`;
        updatedCellClassMap[key] = cellClass;
        hot.setCellMeta(r, c, 'className', cellClass);
      }
    }

    // Update grid data, merged cells, and styles
    setData(currentData);
    setMergedCells(newMergedCells);
    setCellStyles(prev => ({
      ...prev,
      ...updatedStyles,
    }));
    setCellClassMap(prev => ({
      ...prev,
      ...updatedCellClassMap,
    }));

    // Update Handsontable settings to apply merged cells
    hot.updateSettings({
      mergeCells: newMergedCells,
    });

    hot.resumeRender();
    hot.render();
  };

  const handleTemplateClick = () => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        applyTemplate('academic_calendar');
        setIsTemplateModalOpen(false);
      } catch (error) {
        console.error('❌ Error applying template:', error);
        alert('Failed to apply template. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Templates</h3>
          <button
            className="modal-cancel-button"
            onClick={() => setIsTemplateModalOpen(false)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
        {isLoading ? (
          <div className="loading-message">
            <svg
              className="spinning"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              style={{ margin: '20px auto', display: 'block' }}
            >
              <path
                d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10zm0 2a8 8 0 0 0-8 8 8 8 0 0 0 8 8 8 8 0 0 0 8-8 8 8 0 0 0-8-8z"
                fill="currentColor"
                opacity="0.3"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10 2 2 0 0 1-2 2 2 2 0 0 1-2-2 6 6 0 0 0-6-6 2 2 0 0 1-2-2 2 2 0 0 1 2-2z"
                fill="currentColor"
              />
            </svg>
            Applying template...
          </div>
        ) : (
          <div className="template-card" onClick={handleTemplateClick}>
            <h3>Academic Calendar</h3>
            <p>Details: A calendar template for academic scheduling with 6 columns (Date, Days, UG/PG semesters, Events, Remarks).</p>
            {/* Placeholder for future image */}
            {/* <img src="/path/to/template-preview.png" alt="Template Preview" className="template-preview" /> */}
          </div>
        )}
      </div>
    </div>
  );
}

export default TemplateModal;