import React from 'react';
import {
  Sliders,
  BarChart2,
  BookOpen,
  Play,
  Layers,
  Settings,
  Lock,
  Sun,
  Moon,
  Eye,
  ChevronsRight,
} from 'lucide-react';

export type NavTab =
  | 'orderblock_app'
  | 'chart'
  | 'scanner'
  | 'mtf'
  | 'breadth'
  | 'backtest'
  | 'options'
  | 'paper'
  | 'journal'
  | 'datasources';

interface LeftSidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  onOpenSettings,
}) => {
  const isLight = theme === 'light';

  return (
    <aside className="ob-sidebar">
      {/* Top: 3-Bar Brand Logo & Collapse Chevron */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
        {/* OrderBlock Iconic 3-stripe Logo */}
        <div
          className="ob-brand-bars"
          onClick={() => onSelectTab('orderblock_app')}
          title="OrderBlock App Home"
        >
          <div className="ob-bar-green" />
          <div className="ob-bar-amber" />
          <div className="ob-bar-red" />
        </div>

        {/* Double Chevron >> */}
        <button
          style={{ background: 'transparent', border: 'none', color: 'var(--ob-text-muted)', cursor: 'pointer', padding: '4px' }}
          title="Collapse"
        >
          <ChevronsRight size={14} />
        </button>

        {/* Vertical Nav List */}
        <div className="ob-nav-list" style={{ marginTop: '4px' }}>
          {/* OrderBlock Flow Terminal (Active by default in screenshot) */}
          <button
            className={`ob-nav-btn ${activeTab === 'orderblock_app' ? 'active' : ''}`}
            onClick={() => onSelectTab('orderblock_app')}
            title="Live OrderBlock Terminal"
          >
            <Sliders size={18} />
          </button>

          {/* Full Candlestick Terminal */}
          <button
            className={`ob-nav-btn ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => onSelectTab('chart')}
            title="Candlestick Chart & Order Blocks"
          >
            <BarChart2 size={18} />
          </button>

          {/* Trade Journal & Book */}
          <button
            className={`ob-nav-btn ${activeTab === 'journal' ? 'active' : ''}`}
            onClick={() => onSelectTab('journal')}
            title="Trade Journal & Watchlists"
          >
            <BookOpen size={18} />
          </button>

          {/* Backtesting Lab */}
          <button
            className={`ob-nav-btn ${activeTab === 'backtest' ? 'active' : ''}`}
            onClick={() => onSelectTab('backtest')}
            title="Strategy Backtesting"
          >
            <Play size={16} />
          </button>

          {/* Options & Derivatives */}
          <button
            className={`ob-nav-btn ${activeTab === 'options' ? 'active' : ''}`}
            onClick={() => onSelectTab('options')}
            title="Options Analytics & Greeks"
          >
            <Layers size={18} />
          </button>

          {/* Settings */}
          <button
            className="ob-nav-btn"
            onClick={onOpenSettings}
            title="Terminal Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Bottom: Purple Lock Button, Status Dot, Sun/Moon, Eye */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
        {/* VIP Purple Lock */}
        <div className="ob-vip-btn" title="Institutional OrderBlock Access Active">
          <Lock size={15} />
        </div>

        {/* Live Green Pulsing Dot */}
        <div style={{ padding: '2px 0' }} title="Market Status: LIVE">
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
          }} />
        </div>

        {/* Sun / Moon Theme Switcher */}
        <div className="ob-theme-toggle">
          <button
            className={`ob-theme-btn ${isLight ? 'active' : ''}`}
            onClick={onToggleTheme}
            title="Light Mode"
          >
            <Sun size={13} />
          </button>
          <button
            className={`ob-theme-btn ${!isLight ? 'active' : ''}`}
            onClick={onToggleTheme}
            title="Dark Mode"
          >
            <Moon size={13} />
          </button>
        </div>

        {/* Eye Icon */}
        <button
          style={{ background: 'transparent', border: 'none', color: 'var(--ob-text-muted)', cursor: 'pointer', padding: '6px' }}
          title="Toggle Layers"
        >
          <Eye size={16} />
        </button>
      </div>
    </aside>
  );
};
