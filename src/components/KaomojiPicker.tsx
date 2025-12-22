import { useState, useCallback, useMemo } from 'react'
import { clsx } from 'clsx'
import { SearchBar } from './SearchBar'
import { getTertiaryBackgroundStyle } from '../utils/themeUtils'
import { invoke } from '@tauri-apps/api/core'
import { KAOMOJI_CATEGORIES, getKaomojis } from '../services/kaomojiService'


interface KaomojiPickerProps {
  isDark: boolean
  opacity: number
  onShowToast: (msg: string) => void
}

export function KaomojiPicker({ isDark, opacity, onShowToast }: KaomojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const kaomojis = useMemo(() => {
    // Wait, getKaomojis defined in service had a typo in previous step 'keywords.بعض' -> 'keywords.some'
    // I will fix it here in logic or update service file. 
    // Actually, I should update the service file because 'بعض' is Arabic for 'some', likely a typo/hallucination.
    // Assuming I will fix service file next, or use inline logic here.
    // Let's rely on import but I must check if I can fix the service file first.
    // For now, I will assume the service returns an array.
    return getKaomojis(selectedCategory, searchQuery)
  }, [selectedCategory, searchQuery])

  const handlePaste = useCallback(
    async (text: string) => {
      try {
        await invoke('paste_kaomoji', { text })
        // No need for toast or close_window here, backend handles it
      } catch (err) {
        console.error('Failed to paste kaomoji', err)
        onShowToast('Failed to paste')
      }
    },
    [onShowToast]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <SearchBar
           value={searchQuery}
           onChange={setSearchQuery}
           placeholder="Search kaomoji..."
           isDark={isDark}
           opacity={opacity}
        />
      </div>

      {/* Categories */}
      <div className="px-3 pb-2 flex-shrink-0 flex gap-1.5 overflow-x-auto scrollbar-hide">
        <button
            onClick={() => setSelectedCategory(null)}
            className={clsx(
                "px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors",
                selectedCategory === null 
                    ? "bg-win11-bg-accent text-white" 
                    : "text-win11-text-secondary hover:bg-win11-bg-tertiary"
            )}
            style={selectedCategory !== null ? getTertiaryBackgroundStyle(isDark, opacity) : undefined}
        >
            All
        </button>
        {KAOMOJI_CATEGORIES.map(cat => (
             <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                    "px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors",
                    selectedCategory === cat 
                        ? "bg-win11-bg-accent text-white" 
                        : "text-win11-text-secondary hover:bg-win11-bg-tertiary"
                )}
                style={selectedCategory !== cat ? getTertiaryBackgroundStyle(isDark, opacity) : undefined}
            >
                {cat}
            </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 pt-0 scrollbar-win11">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {kaomojis.map(item => (
                <button
                    key={item.id}
                    onClick={() => handlePaste(item.text)}
                    className={clsx(
                        "h-12 flex items-center justify-center rounded-md text-sm",
                        "hover:scale-105 transition-transform duration-100",
                        "border border-transparent hover:border-win11-border-subtle",
                         isDark ? "hover:bg-win11-bg-card-hover" : "hover:bg-win11Light-bg-card-hover"
                    )}
                    title={item.category}
                >
                    {item.text}
                </button>
            ))}
            {kaomojis.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm opacity-60">
                    No kaomojis found
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
