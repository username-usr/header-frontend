import React from 'react';

const MergeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h4v2H7v-2z" fill="currentColor" />
  </svg>
);

function MergeCellButton({ handleMergeToggle }) {
  return (
    <button
      className="format-button"
      onClick={handleMergeToggle}
      title="Merge Selected Cells"
    >
      <MergeIcon />
    </button>
  );
}

export default MergeCellButton;