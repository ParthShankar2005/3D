import React from 'react';

/**
 * Developer Debug Telemetry Panel
 * Live Telemetry Overlay for all 3 Mandatory AR Gate Conditions:
 * 1. Card Shape Confidence (>= 50%)
 * 2. Design Mapping Confidence (>= 60%)
 * 3. QR Code & Backend URL Match (https://sjar.vercel.app)
 */
export const DebugOverlay = ({ validation, isVisible = true }) => {
  if (!isVisible) return null;

  const cardShape = validation?.cardShape || { confidence: 0, valid: false };
  const designMapping = validation?.designMapping || { confidence: 0, valid: false };
  const qr = validation?.qr || { detected: false, value: null, backendMatch: false };
  const arReady = validation?.arReady || false;

  const cardPct = Math.round(cardShape.confidence * 100);
  const designPct = Math.round(designMapping.confidence * 100);

  return (
    <div className="debug-overlay glass-panel">
      <div className="debug-header">
        <i className="fas fa-bug"></i>
        <span>3-Condition AR Gate Telemetry</span>
      </div>

      <div className="debug-metrics">
        {/* Condition 1: Card Shape */}
        <div className="metric-row">
          <div className="metric-label">
            <span>Card Shape ($\ge 50\%$):</span>
            <span className={cardShape.valid ? 'status-pass' : 'status-fail'}>
              {cardPct}% {cardShape.valid ? '✓' : '✗'}
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className={`progress-bar-fill ${cardShape.valid ? 'fill-pass' : 'fill-fail'}`}
              style={{ width: `${Math.min(100, cardPct)}%` }}
            ></div>
          </div>
        </div>

        {/* Condition 2: Design Mapping */}
        <div className="metric-row">
          <div className="metric-label">
            <span>Design Mapping ($\ge 60\%$):</span>
            <span className={designMapping.valid ? 'status-pass' : 'status-fail'}>
              {designPct}% {designMapping.valid ? '✓' : '✗'}
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className={`progress-bar-fill ${designMapping.valid ? 'fill-pass' : 'fill-fail'}`}
              style={{ width: `${Math.min(100, designPct)}%` }}
            ></div>
          </div>
        </div>

        {/* Condition 3: QR Code & Backend URL Match */}
        <div className="metric-row">
          <div className="metric-label">
            <span>QR Code Detected:</span>
            <span className={qr.detected ? 'status-pass' : 'status-fail'}>
              {qr.detected ? 'Detected ✓' : 'Searching... ✗'}
            </span>
          </div>
          {qr.value && (
            <div className="qr-value-box">
              <span className="qr-val-text">{qr.value}</span>
            </div>
          )}
          <div className="metric-label" style={{ marginTop: '4px' }}>
            <span>Backend Match (sjar.vercel.app):</span>
            <span className={qr.backendMatch ? 'status-pass' : 'status-fail'}>
              {qr.backendMatch ? 'TRUE ✓' : 'FALSE ✗'}
            </span>
          </div>
        </div>

        <hr className="debug-divider" />

        {/* Master Gate Status */}
        <div className="master-gate-row">
          <div>
            <span className="gate-title">AR Gate Status:</span>
            <span className={`gate-badge ${arReady ? 'badge-pass' : 'badge-wait'}`}>
              {arReady ? 'AR READY' : 'WAITING'}
            </span>
          </div>
          <div>
            <span className="gate-title">3D Model Instance:</span>
            <span className={`gate-badge ${arReady ? 'badge-pass' : 'badge-hidden'}`}>
              {arReady ? 'VISIBLE' : 'HIDDEN'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
