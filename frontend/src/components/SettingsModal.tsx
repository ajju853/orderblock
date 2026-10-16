import React from 'react';
import type { EngineConfig } from '../types';
import { Settings, X, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EngineConfig;
  onSaveConfig: (newConfig: EngineConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [localConfig, setLocalConfig] = React.useState<EngineConfig>(config);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="modal-title">Engine Configuration & Rules</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Swing Pivot Sensitivity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
              <Sliders size={15} style={{ color: 'var(--accent)' }} />
              <span>Swing Pivot Lookback (Zero Lookahead Bias)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Left Bars (History)</label>
                <input
                  type="number"
                  className="chat-input"
                  min={1}
                  max={10}
                  value={localConfig.swing_left}
                  onChange={(e) => setLocalConfig({ ...localConfig, swing_left: parseInt(e.target.value) || 3 })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Right Bars (Confirmation)</label>
                <input
                  type="number"
                  className="chat-input"
                  min={1}
                  max={10}
                  value={localConfig.swing_right}
                  onChange={(e) => setLocalConfig({ ...localConfig, swing_right: parseInt(e.target.value) || 3 })}
                />
              </div>
            </div>
          </div>

          {/* Break & Zone Rules */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Structure Break Rule
              </label>
              <select
                className="chat-input"
                value={localConfig.break_confirmation}
                onChange={(e) => setLocalConfig({ ...localConfig, break_confirmation: e.target.value as any })}
              >
                <option value="close">Candle Close (Recommended)</option>
                <option value="wick">Wick Penetration</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Zone Boundaries
              </label>
              <select
                className="chat-input"
                value={localConfig.zone_boundary}
                onChange={(e) => setLocalConfig({ ...localConfig, zone_boundary: e.target.value as any })}
              >
                <option value="wick">Full Candle Wick (High-Low)</option>
                <option value="body">Candle Body (Open-Close)</option>
              </select>
            </div>
          </div>

          {/* Displacement & Mitigation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Displacement Threshold (x ATR)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="3.0"
                className="chat-input"
                value={localConfig.displacement_multiplier}
                onChange={(e) => setLocalConfig({ ...localConfig, displacement_multiplier: parseFloat(e.target.value) || 1.0 })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Mitigation Level
              </label>
              <select
                className="chat-input"
                value={localConfig.mitigation_threshold}
                onChange={(e) => setLocalConfig({ ...localConfig, mitigation_threshold: parseFloat(e.target.value) || 0.5 })}
              >
                <option value="0.5">50% Equilibrium Level</option>
                <option value="0.0">First Touch / Boundary</option>
              </select>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button className="action-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="action-btn primary"
              onClick={() => {
                onSaveConfig(localConfig);
                onClose();
              }}
            >
              Apply Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
