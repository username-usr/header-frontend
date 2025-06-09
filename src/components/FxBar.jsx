import React from 'react';

function FxBar({
  fxValue,
  handleFxChange,
  handleFxKeyDown,
  handleFxSubmit,
  isEditingFx,
  setIsEditingFx
}) {
  return (
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
  );
}

export default FxBar;