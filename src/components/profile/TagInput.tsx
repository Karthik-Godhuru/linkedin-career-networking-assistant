import React, { useState, type KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'

interface TagInputProps {
  label: string
  description?: string
  placeholder: string
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  maxTags?: number
  required?: boolean
  error?: string
}

export const TagInput: React.FC<TagInputProps> = ({
  label,
  description,
  placeholder,
  tags,
  onChange,
  suggestions = [],
  maxTags = 15,
  required = false,
  error,
}) => {
  const [inputVal, setInputVal] = useState('')

  const addTag = (text: string) => {
    const cleaned = text.trim()
    if (!cleaned) return
    if (tags.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      setInputVal('')
      return
    }
    if (tags.length >= maxTags) return

    onChange([...tags, cleaned])
    setInputVal('')
  }

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputVal)
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  // Filter out suggestions that are already selected
  const availableSuggestions = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#292722]">
          {label} {required && <span className="text-[#8A5A20]">*</span>}
        </label>
        <span className="text-[11px] text-[#73685B] font-mono">
          {tags.length}/{maxTags}
        </span>
      </div>

      {description && <p className="text-xs text-[#73685B]">{description}</p>}

      {/* Tags Container + Input */}
      <div
        className={`flex flex-wrap items-center gap-1.5 p-2 bg-[#FAF7F2] border rounded-md min-h-[44px] transition-colors ${
          error
            ? 'border-[#F0C4C4] focus-within:ring-1 focus-within:ring-[#942F2F]'
            : 'border-[#D9CFC2] focus-within:border-[#B49A7D] focus-within:ring-1 focus-within:ring-[#B49A7D]'
        }`}
      >
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center text-xs font-medium bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2] rounded px-2 py-0.5 transition-colors"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="ml-1.5 hover:text-[#942F2F] text-[#73685B] focus:outline-none"
              title={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {tags.length < maxTags && (
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputVal.trim()) addTag(inputVal)
            }}
            placeholder={tags.length === 0 ? placeholder : 'Add another...'}
            className="flex-1 min-w-[140px] bg-transparent text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none py-1 px-1"
          />
        )}
      </div>

      {error && <p className="text-[11px] text-[#942F2F]">{error}</p>}

      {/* Clickable Quick Suggestions */}
      {availableSuggestions.length > 0 && tags.length < maxTags && (
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-[#73685B] mr-1">Suggestions:</span>
          {availableSuggestions.slice(0, 6).map((sugg, i) => (
            <button
              key={i}
              type="button"
              onClick={() => addTag(sugg)}
              className="inline-flex items-center text-[11px] text-[#73685B] hover:text-[#292722] bg-[#FAF7F2] hover:bg-[#E8DFD3] border border-[#D9CFC2] rounded px-2 py-0.5 transition-colors"
            >
              <Plus className="w-2.5 h-2.5 mr-1 text-[#73685B]" />
              {sugg}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
