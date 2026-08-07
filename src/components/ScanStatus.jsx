import React from 'react';

/**
 * User-Facing Scan Status Pill Banner
 * Displays high-level friendly status text without complex tech jargon.
 */
export const ScanStatus = ({ statusText, isArReady }) => {
  return (
    <div id="status-pill" className={`status-pill ${isArReady ? 'tracking' : 'searching'}`}>
      <div className="status-dot"></div>
      <span id="status-text">{statusText || 'Scanning target...'}</span>
    </div>
  );
};
