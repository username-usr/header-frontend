import React from 'react';

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

function AIModal({
  isModalOpen,
  setIsModalOpen,
  aiInput,
  setAiInput,
  isLoading,
  setIsLoading,
  aiModel,
  setAiModel,
  handleAiSubmit,
  handleAiKeyDown
}) {
  return (
    <>
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
    </>
  );
}

export default AIModal;