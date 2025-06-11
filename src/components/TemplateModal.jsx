import React, { useState } from 'react';
import { nanoid } from 'nanoid';

// Function to calculate the day of the week for a given date
// Returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
const getDayOfWeek = (year, month, day) => {
  const date = new Date(year, month - 1, day); // Month is 0-indexed in Date object
  return date.getDay();
};

// Function to get the number of days in a month for a given year
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

function TemplateModal({
  isTemplateModalOpen,
  setIsTemplateModalOpen,
  hotRef,
  setData,
  setMergedCells,
  setCellStyles,
  setCellClassMap,
  data,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 0: Template selection, 1: Year input, 2: Confirmation/Applying
  const [academicYear, setAcademicYear] = useState('');
  const [semesterType, setSemesterType] = useState('odd'); // 'odd' or 'even'

  if (!isTemplateModalOpen) return null;

  // Define fixed national holidays for ODD Semester
  const fixedNationalHolidaysOddSem = [
    { month: 8, day: 15, event: 'Independence Day' },
    { month: 8, day: 26, event: 'Sree Krishna Janmashtami' },
    { month: 10, day: 2, event: 'Gandhi Jayanti' },
    { month: 10, day: 11, event: 'Maha Navami / Ayudha Pooja' },
    { month: 11, day: 1, event: 'Kannada Rajyotsava day' },
    { month: 11, day: 2, event: 'Balipadyami Deepavali' },
    { month: 12, day: 25, event: 'Christmas (Holiday)' },
    { month: 9, day: 27, event: "Amma's Birthday (Holiday)" },
    { month: 10, day: 31, event: 'Naraka Chaturdasi (Holiday)' }
  ];

  // Define fixed national holidays for EVEN Semester
  const fixedNationalHolidaysEvenSem = [
    { month: 1, day: 1, event: 'New Year Day' },
    { month: 1, day: 14, event: 'Makara Sankranti' },
    { month: 1, day: 26, event: 'Republic Day' },
    { month: 3, day: 13, event: 'Holi Feast' },
    { month: 3, day: 30, event: 'Chandramana Ugadi' },
    { month: 4, day: 14, event: 'Dr. Ambedkar Jayanthi' },
    { month: 5, day: 1, event: 'May Day' },
    { month: 2, day: 26, event: 'Maha Shivaratri' },
  ];

  // Function to apply the academic calendar template
  const applyAcademicCalendarTemplate = (year, semType) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) {
      console.error('❌ Handsontable instance not found');
      return;
    }

    hot.suspendRender(); // Suspend rendering for performance

    const startYear = parseInt(year, 10);
    let endYear = startYear;
    let academicYearTitleText = `ACADEMIC CALENDAR (${startYear}`;

    let monthsArray = [];
    let fixedNationalHolidays = [];

    if (semType === 'odd') {
      endYear = startYear + 1;
      academicYearTitleText += `-${endYear}) ODD SEMESTER`;
      monthsArray = ['July', 'August', 'September', 'October', 'November', 'December'];
      fixedNationalHolidays = fixedNationalHolidaysOddSem;
    } else {
      endYear = startYear;
      academicYearTitleText += `-${endYear}) EVEN SEMESTER`;
      monthsArray = ['January', 'February', 'March', 'April', 'May', 'June'];
      fixedNationalHolidays = fixedNationalHolidaysEvenSem;
    }

    const templateGridData = [];
    const newMergedCells = [];

    // Row 0: Main Title
    templateGridData.push(['', '', '', '', '', '', '']);
    templateGridData[0][0] = 'Amrita School of Engineering Bengaluru';
    newMergedCells.push({ row: 0, col: 0, rowspan: 1, colspan: 6 });

    // Row 1: Academic Calendar Title
    templateGridData.push(['', '', '', '', '', '', '']);
    templateGridData[1][0] = academicYearTitleText;
    newMergedCells.push({ row: 1, col: 0, rowspan: 1, colspan: 6 });

    // Row 2: Header Row
    templateGridData.push(['Date', 'Days', 'UG-S3,S5,S7 PG-S3', 'UG-S1, PG-S1', 'Events', 'Remarks', '']);

    let currentRowIdx = 3;

    // Generate data for each month
    for (let mIdx = 0; mIdx < monthsArray.length; mIdx++) {
      const monthName = monthsArray[mIdx];
      let monthNumber;
      let currentCalendarYearForMonth;

      if (semType === 'odd') {
        monthNumber = mIdx + 7;
        currentCalendarYearForMonth = startYear;
      } else {
        monthNumber = mIdx + 1;
        currentCalendarYearForMonth = startYear;
      }

      // Month Title Row
      templateGridData.push(['', '', '', '', '', '', '']);
      templateGridData[currentRowIdx][0] = `${monthName} - ${currentCalendarYearForMonth}`;
      newMergedCells.push({ row: currentRowIdx, col: 0, rowspan: 1, colspan: 6 });
      currentRowIdx++;

      const daysInMonth = getDaysInMonth(currentCalendarYearForMonth, monthNumber);
      let saturdayCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        templateGridData.push(['', '', '', '', '', '', '']);
        const dateString = `${day}-${monthName.substring(0, 3)}`;
        const dayOfWeek = getDayOfWeek(currentCalendarYearForMonth, monthNumber, day);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];

        const rowData = [dateString, dayName, '', '', '', '', ''];

        let isHolidayRow = false;
        let eventText = '';
        let remarkText = '';

        if (dayOfWeek === 0) {
          isHolidayRow = true;
          eventText = 'Holiday';
        } else if (dayOfWeek === 6) {
          saturdayCount++;
          remarkText = `${saturdayCount}${saturdayCount === 1 ? 'st' : saturdayCount === 2 ? 'nd' : saturdayCount === 3 ? 'rd' : 'th'} Sat`;
          if (saturdayCount % 2 === 0) {
            isHolidayRow = true;
            eventText = 'Holiday'; // Explicitly set Holiday for even Saturdays
          }
        }

        const fixedHoliday = fixedNationalHolidays.find(h =>
          h.month === monthNumber && h.day === day
        );
        if (fixedHoliday) {
          isHolidayRow = true;
          eventText = fixedHoliday.event;
          remarkText = 'Holiday';
        }

        const isPoojaEvent = eventText.toLowerCase().includes('pooja');

        if (isHolidayRow) {
          rowData[2] = 'H';
          rowData[3] = 'H';
        }

        if (!isPoojaEvent) {
          rowData[4] = eventText;
        } else {
          rowData[4] = '';
        }

        if (!isPoojaEvent && remarkText) {
          rowData[5] = remarkText;
        } else if (isPoojaEvent && remarkText === 'Holiday') {
          rowData[5] = 'Holiday';
        } else {
          rowData[5] = '';
        }

        templateGridData[currentRowIdx] = rowData;

        if (rowData[4] && !rowData[5]) {
          const alreadyMerged = newMergedCells.some(merge =>
            merge.row === currentRowIdx && merge.col === 4 && merge.colspan === 2
          );
          if (!alreadyMerged) {
            newMergedCells.push({ row: currentRowIdx, col: 4, rowspan: 1, colspan: 2 });
          }
        }

        currentRowIdx++;
      }
    }

    // Update grid data and merged cells
    setData(templateGridData);
    setMergedCells(newMergedCells);
    setCellStyles({});
    setCellClassMap({});

    // Update Handsontable settings with merged cells only
    hot.updateSettings({
      mergeCells: newMergedCells,
      colWidths: [80, 70, 120, 120, 250, 100, 50],
    });

    hot.resumeRender();
    hot.render();
  };

  const handleTemplateClick = () => {
    setCurrentPage(1);
  };

  const handleYearAndSemesterSubmit = () => {
    const year = parseInt(academicYear, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      console.log('Please enter a valid year (e.g., 2024).');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      try {
        applyAcademicCalendarTemplate(year, semesterType);
        setIsLoading(false);
        setIsTemplateModalOpen(false);
        setCurrentPage(0);
        setAcademicYear('');
        setSemesterType('odd');
      } catch (error) {
        console.error('❌ Error applying template:', error);
        console.log('Failed to apply template. Please check console for details.');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleBackClick = () => {
    setCurrentPage(0);
    setAcademicYear('');
    setSemesterType('odd');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
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
      );
    }

    switch (currentPage) {
      case 0:
        return (
          <div className="template-card" onClick={handleTemplateClick}>
            <h3>Academic Calendar (Dynamic)</h3>
            <p>Details: A detailed academic calendar with holidays and event schedules, customizable by year and semester.</p>
          </div>
        );
      case 1:
        return (
          <div className="template-input-page">
            <div className="modal-header-nav">
              <button className="nav-button" onClick={handleBackClick}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h4>Enter Details</h4>
            </div>
            <div className="input-group">
              <label htmlFor="academicYearInput">Starting Year:</label>
              <input
                id="academicYearInput"
                type="number"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2024"
                className="modal-input"
              />
            </div>
            <div className="input-group">
              <label>Semester Type:</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="semesterType"
                    value="odd"
                    checked={semesterType === 'odd'}
                    onChange={(e) => setSemesterType(e.target.value)}
                  /> Odd
                </label>
                <label>
                  <input
                    type="radio"
                    name="semesterType"
                    value="even"
                    checked={semesterType === 'even'}
                    onChange={(e) => setSemesterType(e.target.value)}
                  /> Even
                </label>
              </div>
            </div>
            <button className="modal-submit-button" onClick={handleYearAndSemesterSubmit}>
              Apply Template
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Templates</h3>
          <button
            className="modal-cancel-button"
            onClick={() => {
              setIsTemplateModalOpen(false);
              setCurrentPage(0);
              setAcademicYear('');
              setSemesterType('odd');
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}

export default TemplateModal;