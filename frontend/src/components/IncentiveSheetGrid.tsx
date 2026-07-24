import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SHARED_INCENTIVE_TYPES, SHARED_INCENTIVE_LABELS } from '../types';

interface IncentiveSheetGridProps {
  days: string[];
  grid: Record<string, Record<string, number>>;
  totals: Record<string, number>;
  isDistributed: boolean;
  onCellChange: (type: string, date: string, value: string) => void;
}

export default function IncentiveSheetGrid({
  days,
  grid,
  totals,
  isDistributed,
  onCellChange,
}: IncentiveSheetGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [focusedCell, setFocusedCell] = useState<{ type: string; date: string } | null>(null);

  // Format just the day number
  const formatDayNum = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').getDate();
  };

  // Get weekday abbreviation
  const getWeekday = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Scroll the grid left/right
  const scrollGrid = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      });
    }
  };

  // Get cell key
  const getCellKey = (type: string, date: string) => `${type}-${date}`;

  // Navigate to a cell
  const focusCell = useCallback((type: string, date: string) => {
    const key = getCellKey(type, date);
    const cell = cellRefs.current.get(key);
    if (cell) {
      cell.focus();
      cell.select();
      setFocusedCell({ type, date });
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentType: string, currentDate: string) => {
      const typeIndex = SHARED_INCENTIVE_TYPES.indexOf(currentType as any);
      const dayIndex = days.indexOf(currentDate);

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            // Move left
            if (dayIndex > 0) {
              focusCell(currentType, days[dayIndex - 1]);
            } else if (typeIndex > 0) {
              // Wrap to previous row, last column
              focusCell(SHARED_INCENTIVE_TYPES[typeIndex - 1], days[days.length - 1]);
            }
          } else {
            // Move right
            if (dayIndex < days.length - 1) {
              focusCell(currentType, days[dayIndex + 1]);
            } else if (typeIndex < SHARED_INCENTIVE_TYPES.length - 1) {
              // Wrap to next row, first column
              focusCell(SHARED_INCENTIVE_TYPES[typeIndex + 1], days[0]);
            }
          }
          break;

        case 'Enter':
          e.preventDefault();
          // Move down to next row
          if (typeIndex < SHARED_INCENTIVE_TYPES.length - 1) {
            focusCell(SHARED_INCENTIVE_TYPES[typeIndex + 1], currentDate);
          } else {
            // Wrap to first row, next day
            if (dayIndex < days.length - 1) {
              focusCell(SHARED_INCENTIVE_TYPES[0], days[dayIndex + 1]);
            }
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (dayIndex < days.length - 1) {
            focusCell(currentType, days[dayIndex + 1]);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (dayIndex > 0) {
            focusCell(currentType, days[dayIndex - 1]);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (typeIndex < SHARED_INCENTIVE_TYPES.length - 1) {
            focusCell(SHARED_INCENTIVE_TYPES[typeIndex + 1], currentDate);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (typeIndex > 0) {
            focusCell(SHARED_INCENTIVE_TYPES[typeIndex - 1], currentDate);
          }
          break;
      }
    },
    [days, focusCell]
  );

  // Register cell ref
  const setCellRef = (key: string, el: HTMLInputElement | null) => {
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Scroll controls */}
      <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-b shrink-0">
        <p className="text-xs text-slate-500">
          {isDistributed
            ? 'This sheet has been distributed. Values are locked.'
            : 'Tab between cells • Enter to go down • Arrow keys to navigate'}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrollGrid('left')}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollGrid('right')}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Fixed left column (type labels) */}
          <div className="shrink-0 border-r bg-white z-10">
            {/* Header cell */}
            <div className="h-16 border-b bg-slate-100 flex items-end px-3 pb-2">
              <span className="text-xs font-semibold text-slate-600 uppercase">Type</span>
            </div>
            {/* Type rows */}
            {SHARED_INCENTIVE_TYPES.map((type) => (
              <div
                key={type}
                className="h-12 border-b flex items-center px-3 bg-white"
              >
                <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                  {SHARED_INCENTIVE_LABELS[type]}
                </span>
              </div>
            ))}
          </div>

          {/* Scrollable day columns */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="inline-flex min-w-full">
              {days.map((day) => (
                <div key={day} className="shrink-0 w-16 border-r">
                  {/* Day header */}
                  <div className="h-16 border-b bg-slate-100 flex flex-col items-center justify-end pb-1.5">
                    <span className="text-[10px] text-slate-400 leading-none">
                      {getWeekday(day)}
                    </span>
                    <span className="text-sm font-bold text-slate-700 leading-tight">
                      {formatDayNum(day)}
                    </span>
                  </div>
                  {/* Input cells */}
                  {SHARED_INCENTIVE_TYPES.map((type) => {
                    const cellKey = getCellKey(type, day);
                    return (
                      <div
                        key={cellKey}
                        className="h-12 border-b flex items-center justify-center px-0.5"
                      >
                        <input
                          ref={(el) => setCellRef(cellKey, el)}
                          type="number"
                          step="0.5"
                          min="0"
                          value={grid[type]?.[day] || ''}
                          onChange={(e) => onCellChange(type, day, e.target.value)}
                          onFocus={(e) => {
                            setFocusedCell({ type: type, date: day });
                            e.target.select();
                          }}

                          onKeyDown={(e) => handleKeyDown(e, type, day)}
                          disabled={isDistributed}
                          className={`w-full h-8 text-center text-sm border rounded outline-none transition-colors
                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                            ${isDistributed
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                              : focusedCell?.type === type && focusedCell?.date === day
                                ? 'border-indigo-500 ring-2 ring-indigo-200 bg-white'
                                : 'border-slate-200 hover:border-indigo-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                          placeholder="–"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Totals column */}
              <div className="shrink-0 w-20 bg-indigo-50 border-l-2 border-indigo-300 sticky right-0">
                <div className="h-16 border-b bg-indigo-100 flex items-end justify-center pb-2">
                  <span className="text-xs font-bold text-indigo-700 uppercase">Total</span>
                </div>
                {SHARED_INCENTIVE_TYPES.map((type) => (
                  <div
                    key={`total-${type}`}
                    className="h-12 border-b flex items-center justify-center"
                  >
                    <span className="text-sm font-bold text-indigo-700">
                      {(totals[type] || 0).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
