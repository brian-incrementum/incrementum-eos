'use client'

import { useState, useEffect } from 'react'

interface ColumnResizeHandleProps {
  columnKey: string
  onResize: (columnKey: string, width: number) => void
  minWidth?: number
  maxWidth?: number
}

export function ColumnResizeHandle({
  columnKey,
  onResize,
  minWidth = 80,
  maxWidth = 400,
}: ColumnResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsResizing(true)
    setStartX(e.clientX)

    // Get the th element (parent of parent: handle -> th)
    const th = (e.target as HTMLElement).closest('th')
    if (th) {
      setStartWidth(th.offsetWidth)
    }
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + diff))
      onResize(columnKey, newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, startX, startWidth, columnKey, onResize, minWidth, maxWidth])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 ${
        isResizing ? 'bg-blue-500' : 'bg-transparent'
      } transition-colors`}
      style={{ zIndex: 10 }}
    />
  )
}
