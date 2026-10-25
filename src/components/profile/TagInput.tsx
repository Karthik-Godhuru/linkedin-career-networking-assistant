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
    <div className="space-y-2 text-left">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-200">
          {label} {required && <span className="text-blue-400">*</span>}
        </label>
        <span className="text-[11px] text-slate-500">
          {tags.length}/{maxTags}
        </span>
      </div>

      {description && <p className="text-xs text-slate-400">{description}</p>}

      {/* Tags Container + Input */}
      <div
        className={`flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 border rounded-xl min-h-[44px] transition-colors ${
          error
            ? 'border-red-500/80 focus-within:ring-1 focus-within:ring-red-500'
            : 'border-slate-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'
        }`}
      >
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center text-xs font-medium bg-blue-950/90 text-blue-300 border border-blue-800/80 rounded-lg px-2.5 py-1 transition-all"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="ml-1.5 hover:text-white text-blue-400 focus:outline-none"
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
            className="flex-1 min-w-[140px] bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none py-1 px-1"
          />
        )}
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {/* Clickable Quick Suggestions */}
      {availableSuggestions.length > 0 && tags.length < maxTags && (
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1">Suggestions:</span>
          {availableSuggestions.slice(0, 6).map((sugg, i) => (
            <button
              key={i}
              type="button"
              onClick={() => addTag(sugg)}
              className="inline-flex items-center text-[11px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-md px-2 py-0.5 transition-colors"
            >
              <Plus className="w-2.5 h-2.5 mr-1 text-slate-400" />
              {sugg}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
