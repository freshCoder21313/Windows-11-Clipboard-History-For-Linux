import { getCurrentWindow } from '@tauri-apps/api/window'

/**
 * Drag handle component that allows dragging the window
 */
export function DragHandle() {
  const handleMouseDown = async () => {
    try {
      await getCurrentWindow().startDragging()
    } catch (error) {
      console.error('Failed to start dragging:', error)
    }
  }

  return (
    <div
      className="w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
    >
      <div className="w-16 h-1 rounded-full dark:bg-white/20 bg-black/20" />
    </div>
  )
}
