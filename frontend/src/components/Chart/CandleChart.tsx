import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AnalysisResult, OrderBlockZone } from '../../types';

interface CandleChartProps {
  analysis: AnalysisResult | null;
  selectedZone: OrderBlockZone | null;
  onSelectZone: (zone: OrderBlockZone | null) => void;
  showOrderBlocks: boolean;
  showStructure: boolean;
  showFVG: boolean;
  showLiquidity: boolean;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  analysis,
  selectedZone,
  onSelectZone,
  showOrderBlocks,
  showStructure,
  showFVG,
  showLiquidity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport navigation state
  const [offsetIndex, setOffsetIndex] = useState<number>(0); // index of rightmost visible candle
  const [visibleCandlesCount, setVisibleCandlesCount] = useState<number>(60);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const candles = analysis?.candles || [];

  // Reset to latest candles on analysis change
  useEffect(() => {
    if (candles.length > 0) {
      setOffsetIndex(Math.max(0, candles.length - visibleCandlesCount));
    }
  }, [analysis?.symbol, candles.length]);

  // Main rendering loop
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    if (candles.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No candle data loaded. Select an instrument or upload CSV.', width / 2, height / 2);
      return;
    }

    const rightMargin = 75; // Price axis
    const bottomMargin = 28; // Time axis
    const chartWidth = width - rightMargin;
    const chartHeight = height - bottomMargin;

    // Slice visible candles
    const startIndex = Math.max(0, Math.min(offsetIndex, candles.length - 1));
    const endIndex = Math.min(candles.length, startIndex + visibleCandlesCount);
    const visibleCandles = candles.slice(startIndex, endIndex);

    if (visibleCandles.length === 0) return;

    // Find min and max price
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    visibleCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    // Add padding to price range
    const priceRange = maxPrice - minPrice || 1;
    const paddedMin = minPrice - priceRange * 0.08;
    const paddedMax = maxPrice + priceRange * 0.08;
    const paddedRange = paddedMax - paddedMin;

    const priceToY = (price: number) => {
      return chartHeight - ((price - paddedMin) / paddedRange) * chartHeight;
    };

    const yToPrice = (y: number) => {
      return paddedMin + (1 - y / chartHeight) * paddedRange;
    };

    const candleWidth = chartWidth / visibleCandles.length;
    const bodyWidth = Math.max(2, candleWidth * 0.72);

    const indexToX = (idx: number) => {
      const relIdx = idx - startIndex;
      return relIdx * candleWidth + candleWidth / 2;
    };

    // Draw Price Grid lines
    ctx.strokeStyle = '#151b2a';
    ctx.lineWidth = 1;
    const gridSteps = 6;
    for (let i = 0; i <= gridSteps; i++) {
      const p = paddedMin + (paddedRange / gridSteps) * i;
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(2), chartWidth + 6, y + 3);
    }

    // 1. Draw Fair Value Gaps (FVG)
    if (showFVG && analysis?.fvgs) {
      analysis.fvgs.forEach((fvg) => {
        if (fvg.status === 'filled') return;
        const startX = indexToX(fvg.candle_index);
        const yTop = priceToY(fvg.high);
        const yBottom = priceToY(fvg.low);
        const boxHeight = yBottom - yTop;

        ctx.fillStyle = fvg.type === 'bullish' ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 179, 0, 0.12)';
        ctx.strokeStyle = fvg.type === 'bullish' ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 179, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        ctx.fillRect(Math.max(0, startX), yTop, chartWidth - Math.max(0, startX), boxHeight);
        ctx.strokeRect(Math.max(0, startX), yTop, chartWidth - Math.max(0, startX), boxHeight);
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = fvg.type === 'bullish' ? '#00e5ff' : '#ffb300';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`FVG ${fvg.type.toUpperCase()}`, chartWidth - 8, yTop + 11);
      });
    }

    // 2. Draw Order Blocks (OB)
    if (showOrderBlocks && analysis?.order_blocks) {
      analysis.order_blocks.forEach((ob) => {
        const startX = indexToX(ob.source_candle_index);
        const yHigh = priceToY(ob.high);
        const yLow = priceToY(ob.low);
        const yEq = priceToY(ob.eq_price);
        const boxHeight = Math.max(2, yLow - yHigh);
        const isSelected = selectedZone?.id === ob.id;

        const isBullish = ob.type === 'bullish';
        const isInvalidated = ob.status === 'invalidated';

        // Background styling
        if (isSelected) {
          ctx.fillStyle = isBullish ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 82, 82, 0.35)';
          ctx.strokeStyle = '#60a5fa'; // Blue glow for selection
          ctx.lineWidth = 2;
        } else if (isInvalidated) {
          ctx.fillStyle = 'rgba(100, 116, 139, 0.08)';
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
          ctx.lineWidth = 1;
        } else {
          ctx.fillStyle = isBullish ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)';
          ctx.strokeStyle = isBullish ? '#00e676' : '#ff5252';
          ctx.lineWidth = 1.2;
        }

        ctx.setLineDash([4, 3]);
        const drawX = Math.max(0, startX);
        const drawW = chartWidth - drawX;

        ctx.fillRect(drawX, yHigh, drawW, boxHeight);
        ctx.strokeRect(drawX, yHigh, drawW, boxHeight);

        // 50% Equilibrium line
        if (!isInvalidated) {
          ctx.beginPath();
          ctx.strokeStyle = isBullish ? 'rgba(0, 230, 118, 0.45)' : 'rgba(255, 82, 82, 0.45)';
          ctx.moveTo(drawX, yEq);
          ctx.lineTo(chartWidth, yEq);
          ctx.stroke();
        }

        ctx.setLineDash([]);

        // Badge Tag on right
        const badgeColor = isBullish ? '#00e676' : '#ff5252';
        ctx.fillStyle = isInvalidated ? '#64748b' : badgeColor;
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${isBullish ? 'BULL' : 'BEAR'} OB [${ob.status.toUpperCase()}]`,
          drawX + 8,
          yHigh + 11
        );
      });
    }

    // 3. Draw Market Structure Breaks (BOS / CHoCH)
    if (showStructure && analysis?.structure_events) {
      analysis.structure_events.forEach((ev) => {
        const breakX = indexToX(ev.event_index);
        const y = priceToY(ev.broken_swing_price);
        const isBullish = ev.type.includes('bullish');
        const isChoch = ev.type.includes('choch');

        ctx.strokeStyle = isBullish ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 2]);

        ctx.beginPath();
        ctx.moveTo(Math.max(0, breakX - 60), y);
        ctx.lineTo(breakX, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Event label
        const labelText = isChoch ? (isBullish ? 'CHoCH ↑' : 'CHoCH ↓') : (isBullish ? 'BOS ↑' : 'BOS ↓');
        ctx.fillStyle = isBullish ? '#10b981' : '#ef4444';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, breakX, y - 5);
      });
    }

    // 4. Draw Liquidity Pools (EQH / EQL)
    if (showLiquidity && analysis?.liquidity_levels) {
      analysis.liquidity_levels.forEach((liq) => {
        const y = priceToY(liq.price);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f59e0b';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$$ ${liq.type} (${liq.status})`, 8, y - 3);
      });
    }

    // 5. Draw Candlesticks & Volume
    visibleCandles.forEach((c, i) => {
      const x = i * candleWidth + candleWidth / 2;
      const isGreen = c.close >= c.open;
      const color = isGreen ? '#00e676' : '#ff5252';

      const yOpen = priceToY(c.open);
      const yClose = priceToY(c.close);
      const yHigh = priceToY(c.high);
      const yLow = priceToY(c.low);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
    });

    // 5. Crosshair & Hover Tooltip
    if (mousePos && mousePos.x < chartWidth && mousePos.y < chartHeight) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price indicator bubble on Y axis
      const hoveredPrice = yToPrice(mousePos.y);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(chartWidth, mousePos.y - 10, rightMargin, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hoveredPrice.toFixed(2), chartWidth + rightMargin / 2, mousePos.y + 4);

      // Time indicator bubble on X axis
      const hoveredCandleRelIdx = Math.floor(mousePos.x / candleWidth);
      const hoveredIdx = startIndex + hoveredCandleRelIdx;
      if (hoveredIdx >= 0 && hoveredIdx < candles.length) {
        const hc = candles[hoveredIdx];
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(mousePos.x - 55, chartHeight, 110, bottomMargin);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hc.timestamp.slice(5, 16), mousePos.x, chartHeight + 16);
      }
    }
  }, [
    analysis,
    offsetIndex,
    visibleCandlesCount,
    candles,
    selectedZone,
    showOrderBlocks,
    showStructure,
    showFVG,
    showLiquidity,
    mousePos,
  ]);

  // Handle Resize and Canvas redraw
  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? -6 : 6;
    setVisibleCandlesCount((prev) => Math.max(15, Math.min(candles.length, prev + zoomFactor)));
  };

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    const candleWidth = (rect?.width || 800) / visibleCandlesCount;
    const shift = Math.round(deltaX / candleWidth);

    if (shift !== 0) {
      setOffsetIndex((prev) => Math.max(0, Math.min(candles.length - visibleCandlesCount, prev - shift)));
      setDragStartX(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Click on zone detection
  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !analysis) return;
    const clickY = e.clientY - rect.top;
    const chartHeight = rect.height - 28;

    // Convert clickY to price
    const startIndex = Math.max(0, Math.min(offsetIndex, candles.length - 1));
    const visibleCandles = candles.slice(startIndex, startIndex + visibleCandlesCount);
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    visibleCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });
    const priceRange = maxPrice - minPrice || 1;
    const paddedMin = minPrice - priceRange * 0.08;
    const paddedMax = maxPrice + priceRange * 0.08;
    const clickedPrice = paddedMin + (1 - clickY / chartHeight) * (paddedMax - paddedMin);

    // Find clicked order block
    const clickedOB = analysis.order_blocks.find(
      (ob) => clickedPrice >= ob.low && clickedPrice <= ob.high
    );

    onSelectZone(clickedOB || null);
  };

  return (
    <div className="canvas-wrapper" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="interactive-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setMousePos(null);
        }}
        onClick={handleClick}
      />
    </div>
  );
};
