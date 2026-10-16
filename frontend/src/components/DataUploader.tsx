import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, FileText, Loader2 } from 'lucide-react';

interface DataUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (symbol: string, timeframe: string) => void;
}

export const DataUploader: React.FC<DataUploaderProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [symbol, setSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [uploading, setUploading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      if (!symbol) {
        setSymbol(f.name.replace('.csv', '').toUpperCase());
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (!symbol) {
        setSymbol(f.name.replace('.csv', '').toUpperCase());
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('symbol', symbol || file.name.replace('.csv', '').toUpperCase());
    formData.append('timeframe', timeframe);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/data/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      if (data.success) {
        setTimeout(() => {
          onSuccess(data.symbol, data.timeframe);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="modal-title">Import Custom Market CSV</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Drag & drop box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            style={{
              border: '2px dashed var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '30px 20px',
              textAlign: 'center',
              background: 'var(--bg-primary)',
              cursor: 'pointer',
              marginBottom: 16,
            }}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <FileText size={22} style={{ color: 'var(--bullish)' }} />
                <span style={{ fontWeight: 600 }}>{file.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div>
                <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                  Drag & Drop your candle CSV here
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Supports timestamp, open, high, low, close, volume columns (Zerodha, TradingView, Yahoo)
                </div>
              </div>
            )}
          </div>

          {/* Metadata Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Symbol Name
              </label>
              <input
                type="text"
                className="chat-input"
                placeholder="e.g. INFY, SBIN, CRUDEOIL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Timeframe
              </label>
              <select
                className="chat-input"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
                <option value="1d">1d</option>
              </select>
            </div>
          </div>

          {/* Validation Report */}
          {result && (
            <div
              style={{
                background: result.success ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 82, 82, 0.08)',
                border: `1px solid ${result.success ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 82, 82, 0.3)'}`,
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
                {result.success ? (
                  <CheckCircle size={15} style={{ color: 'var(--bullish)' }} />
                ) : (
                  <AlertTriangle size={15} style={{ color: 'var(--bearish)' }} />
                )}
                <span>
                  {result.success
                    ? `Validated ${result.summary.accepted_rows} candles successfully!`
                    : 'Validation Failed'}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Accepted: {result.summary.accepted_rows} rows | Rejected: {result.summary.rejected_rows} rows
              </div>
              {result.summary.errors?.length > 0 && (
                <div style={{ marginTop: 6, color: 'var(--bearish)', fontSize: '0.75rem' }}>
                  Errors: {result.summary.errors[0]}
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--bearish)', fontSize: '0.8rem', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="action-btn" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button
              className="action-btn primary"
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{ minWidth: 100, justifyContent: 'center' }}
            >
              {uploading ? <Loader2 size={15} className="pulse-dot" /> : 'Validate & Load'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
