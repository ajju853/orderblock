import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface StockSearchItem {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change_pct: number;
  bias: 'BULL' | 'BEAR';
}

const SEARCH_UNIVERSE: StockSearchItem[] = [
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'BANK', price: 842.35, change_pct: 2.84, bias: 'BULL' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'BANK', price: 1184.50, change_pct: 2.31, bias: 'BULL' },
  { symbol: 'TITAN', name: 'Titan Company Ltd', sector: 'CONSUMPTION', price: 3420.00, change_pct: 2.06, bias: 'BULL' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'OIL & GAS', price: 2740.00, change_pct: 1.75, bias: 'BULL' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', price: 3950.00, change_pct: 1.45, bias: 'BULL' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'METAL', price: 158.40, change_pct: 1.95, bias: 'BULL' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'FIN SERVICE', price: 7180.00, change_pct: 1.60, bias: 'BULL' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'TELECOM', price: 1640.00, change_pct: 1.35, bias: 'BULL' },
  { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', price: 1842.35, change_pct: -2.47, bias: 'BEAR' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', price: 512.60, change_pct: -1.88, bias: 'BEAR' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'IT', price: 1720.00, change_pct: -1.64, bias: 'BEAR' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'AUTO', price: 890.00, change_pct: -1.55, bias: 'BEAR' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'BANK', price: 1680.00, change_pct: -1.25, bias: 'BEAR' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', sector: 'IT', price: 1520.00, change_pct: -1.40, bias: 'BEAR' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'BANK', price: 1790.00, change_pct: -0.95, bias: 'BEAR' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma Industries', sector: 'PHARMA', price: 1780.00, change_pct: -0.80, bias: 'BEAR' },
  { symbol: 'NIFTY 50', name: 'Nifty 50 Index', sector: 'INDEX', price: 24865.40, change_pct: 0.33, bias: 'BULL' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty Index', sector: 'INDEX', price: 51240.20, change_pct: 0.65, bias: 'BULL' },
];

interface TopSearchModalProps {
  onSelectStock: (symbol: string) => void;
  theme?: 'light' | 'dark';
}

export const TopSearchModal: React.FC<TopSearchModalProps> = ({
  onSelectStock,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filtered = SEARCH_UNIVERSE.filter(
    (s) =>
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.sector.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Top Header Search Trigger Pill */}
      <div className="ob-search-pill" onClick={() => setIsOpen(true)}>
        <Search size={14} style={{ color: 'var(--ob-text-muted)' }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Search stocks
        </span>
        <kbd style={{
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          backgroundColor: 'var(--ob-card-bg)',
          border: '1px solid var(--ob-border)',
          color: 'var(--ob-text-muted)'
        }}>
          Ctrl K
        </kbd>
      </div>

      {/* Floating Instant Search Dropdown Modal */}
      {isOpen && (
        <div className="ob-modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="ob-inspector-modal"
            style={{ width: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--ob-border)',
              gap: '10px'
            }}>
              <Search size={18} style={{ color: 'var(--ob-bull)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search F&O stocks (e.g. SBIN, INFY, TCS)..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--ob-text)',
                  fontFamily: 'inherit'
                }}
              />
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ob-text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Results List */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '8px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '12px', color: 'var(--ob-text-muted)' }}>
                  No stocks found for "{query}"
                </div>
              ) : (
                filtered.map((item) => {
                  const isBull = item.bias === 'BULL';
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => {
                        onSelectStock(item.symbol);
                        setIsOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid var(--ob-border)'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ob-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: isBull ? 'var(--ob-bull-bg)' : 'var(--ob-bear-bg)',
                          color: isBull ? 'var(--ob-bull)' : 'var(--ob-bear)'
                        }}>
                          {item.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--ob-text)' }}>{item.symbol}</strong>
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'var(--ob-card-hover)', color: 'var(--ob-text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {item.sector}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--ob-text-muted)' }}>{item.name}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                            ₹{item.price.toLocaleString()}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            fontFamily: 'var(--font-mono)',
                            color: item.change_pct >= 0 ? 'var(--ob-bull)' : 'var(--ob-bear)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '2px'
                          }}>
                            {item.change_pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {item.change_pct >= 0 ? `+${item.change_pct}%` : `${item.change_pct}%`}
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--ob-text-muted)' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderTop: '1px solid var(--ob-border)',
              backgroundColor: 'var(--ob-card-hover)',
              fontSize: '11px',
              color: 'var(--ob-text-muted)',
              fontFamily: 'var(--font-mono)'
            }}>
              <span>200+ NSE F&amp;O Universe</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
