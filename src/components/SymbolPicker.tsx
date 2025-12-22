/**
 * Symbol Picker Component
 * Windows 11 style symbol picker
 */
import { memo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useSymbolPicker } from '../hooks/useSymbolPicker'
import { SearchBar } from './SearchBar'
import { getTertiaryBackgroundStyle } from '../utils/themeUtils'
import type { SymbolItem } from '../services/symbolService'



interface SymbolCellProps {
  symbol: SymbolItem
  onSelect: (symbol: SymbolItem) => void
  onHover: (symbol: SymbolItem | null) => void
}

const SymbolCell = memo(function SymbolCell({
  symbol,
  onSelect,
  onHover,
}: SymbolCellProps) {
  return (
    <button
      onClick={() => onSelect(symbol)}
      onMouseEnter={() => onHover(symbol)}
      onMouseLeave={() => onHover(null)}
      className={clsx(
        'flex items-center justify-center',
        'w-10 h-10 text-xl',
        'rounded-md transition-transform duration-100',
        'hover:bg-win11Light-bg-tertiary dark:hover:bg-win11-bg-card-hover',
        'hover:scale-110 transform-gpu hover:will-change-transform',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-win11-bg-accent'
      )}
      title={symbol.name}
    >
      {symbol.char}
    </button>
  )
})

interface CategoryPillProps {
  category: string
  isActive: boolean
  onClick: () => void
  isDark: boolean
  opacity: number
}

const CategoryPill = memo(function CategoryPill({
  category,
  isActive,
  onClick,
  isDark,
  opacity,
}: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1 text-xs rounded-full whitespace-nowrap',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-win11-bg-accent',
        isActive
          ? 'bg-win11-bg-accent text-white'
          : [
              'text-win11Light-text-secondary dark:text-win11-text-secondary',
              'hover:dark:bg-win11-bg-card-hover hover:bg-win11Light-bg-card-hover',
            ]
      )}
      style={!isActive ? getTertiaryBackgroundStyle(isDark, opacity) : undefined}
    >
      {category}
    </button>
  )
})

export interface SymbolPickerProps {
  isDark: boolean
  opacity: number
}

export function SymbolPicker({ isDark, opacity }: SymbolPickerProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    filteredSymbols,
    recentSymbols,
    pasteSymbol,
  } = useSymbolPicker()

  const [hoveredSymbol, setHoveredSymbol] = useState<SymbolItem | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollCategories = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search symbols..."
          isDark={isDark}
          opacity={opacity}
        />
      </div>

      {/* Recent symbols (only show when not searching and on All category) */}
      {!searchQuery && !selectedCategory && recentSymbols.length > 0 && (
        <div className="px-3 pb-2 flex-shrink-0 border-b dark:border-win11-border-subtle border-win11Light-border mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3 h-3 dark:text-win11-text-tertiary text-win11Light-text-secondary" />
            <span className="text-xs dark:text-win11-text-tertiary text-win11Light-text-secondary">
              Recently used
            </span>
          </div>
          <div className="flex flex-wrap gap-1 pb-2">
            {recentSymbols.slice(0, 16).map((symbol, index) => (
              <SymbolCell
                key={`recent-${symbol.char}-${index}`}
                symbol={symbol}
                onSelect={pasteSymbol}
                onHover={setHoveredSymbol}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category pills */}
      {!searchQuery && (
        <div className="px-3 pb-2 flex-shrink-0 flex items-center gap-1">
          <button
            onClick={() => scrollCategories('left')}
            className="p-1 rounded-full hover:bg-win11Light-bg-tertiary dark:hover:bg-win11-bg-card-hover text-win11Light-text-secondary dark:text-win11-text-secondary"
            tabIndex={-1}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex gap-1.5 overflow-x-hidden scroll-smooth flex-1"
          >
            <CategoryPill
              category="All"
              isActive={selectedCategory === null}
              onClick={() => setSelectedCategory(null)}
              isDark={isDark}
              opacity={opacity}
            />
            {categories.map((cat) => (
              <CategoryPill
                key={cat}
                category={cat}
                isActive={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                isDark={isDark}
                opacity={opacity}
              />
            ))}
          </div>

          <button
            onClick={() => scrollCategories('right')}
            className="p-1 rounded-full hover:bg-win11Light-bg-tertiary dark:hover:bg-win11-bg-card-hover text-win11Light-text-secondary dark:text-win11-text-secondary"
            tabIndex={-1}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Symbol grid */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-win11 px-3 pb-2">
        {filteredSymbols.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <p className="text-sm dark:text-win11-text-secondary text-win11Light-text-secondary">
              No symbols found
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap content-start gap-1">
            {filteredSymbols.map((symbol, index) => (
              <SymbolCell
                key={`${symbol.char}-${index}`}
                symbol={symbol}
                onSelect={pasteSymbol}
                onHover={setHoveredSymbol}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with hovered symbol info */}
      <div
        className={clsx(
          'px-3 py-2 h-10 flex-shrink-0',
          'border-t dark:border-win11-border-subtle border-win11Light-border',
          'flex items-center gap-2'
        )}
      >
        {hoveredSymbol ? (
          <>
            <span className="text-xl">{hoveredSymbol.char}</span>
            <span className="text-xs dark:text-win11-text-secondary text-win11Light-text-secondary truncate">
              {hoveredSymbol.name}
            </span>
          </>
        ) : (
          <span className="text-xs dark:text-win11-text-tertiary text-win11Light-text-secondary">
            Click to paste symbol
          </span>
        )}
      </div>
    </div>
  )
}
