import React, { useState } from 'react'
import type { InternshipRawInput } from '../../types/internship'
import { parseInternshipsFromCSV } from '../../services/ingestion/internshipCsvParser'
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'

interface CsvImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (items: InternshipRawInput[]) => Promise<{ importedCount: number; duplicateCount: number }>
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [csvContent, setCsvContent] = useState<string>('')
  const [previewItems, setPreviewItems] = useState<InternshipRawInput[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  if (!isOpen) return null

  const handleTextChange = (text: string) => {
    setCsvContent(text)
    setError(null)
    if (!text.trim()) {
      setPreviewItems([])
      return
    }
    const parsed = parseInternshipsFromCSV(text)
    setPreviewItems(parsed)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      handleTextChange(text)
    }
    reader.onerror = () => {
      setError('Failed to read the selected CSV file.')
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (previewItems.length === 0) {
      setError('No valid internship opportunities found in CSV. Please verify column headers.')
      return
    }

    setIsProcessing(true)
    await onImport(previewItems)
    setIsProcessing(false)
    setCsvContent('')
    setPreviewItems([])
    onClose()
  }

  const sampleCsvTemplate = `Title,Company,Location,Work Mode,URL,Deadline,Skills
"Machine Learning Intern","NVIDIA","Santa Clara, CA","Hybrid","https://nvidia.wd5.myworkdayjobs.com/sample-ml-intern","2026-11-20","Python, PyTorch, CUDA, C++"
"AI Systems Engineering Intern","OpenAI","San Francisco, CA","Onsite","https://jobs.lever.co/openai/sample-ai-systems-intern","2026-12-05","Python, Distributed Systems, Kubernetes"`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B19]/70 backdrop-blur-sm">
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] text-left">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#D9CFC2] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#1C1B19] text-[#C6A76B]">
              <Upload className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-[#292722] tracking-tight">
              Import Opportunities via CSV
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#73685B] hover:text-[#292722] p-1.5 rounded-xl hover:bg-[#E8DFD3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-[#FCEEEE] border border-[#F0C4C4] text-[#942F2F] rounded-md text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File picker */}
          <div className="border-2 border-dashed border-[#D9CFC2] hover:border-[#B49A7D] rounded-md p-4 text-center transition-colors">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
              id="internship-csv-upload"
            />
            <label
              htmlFor="internship-csv-upload"
              className="cursor-pointer flex flex-col items-center justify-center text-xs text-[#73685B] hover:text-[#292722]"
            >
              <FileText className="w-7 h-7 text-[#B49A7D] mb-1.5" />
              <span className="font-semibold text-[#292722]">Click to upload CSV</span> or drag and drop
              <span className="text-[11px] text-[#73685B] mt-0.5">Supports spreadsheets, GitHub internship trackers, etc.</span>
            </label>
          </div>

          {/* Paste Raw CSV Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#292722]">Or Paste CSV Text</label>
              <button
                type="button"
                onClick={() => handleTextChange(sampleCsvTemplate)}
                className="text-[11px] text-[#292722] hover:text-[#B49A7D] hover:underline font-medium"
              >
                Insert Sample Format
              </button>
            </div>
            <textarea
              value={csvContent}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={4}
              placeholder="Title, Company, Location, Work Mode, URL, Deadline, Skills..."
              className="w-full font-mono text-xs bg-[#FAF7F2] border border-[#D9CFC2] rounded-md p-3 text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
            />
          </div>

          {/* Preview count */}
          {previewItems.length > 0 && (
            <div className="p-3 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md space-y-2">
              <div className="flex items-center text-xs text-[#2E5A36] font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Parsed {previewItems.length} valid opportunities ready for evaluation:
              </div>
              <ul className="text-xs text-[#73685B] space-y-1 max-h-28 overflow-y-auto pl-2 border-l border-[#D9CFC2]">
                {previewItems.map((item, idx) => (
                  <li key={idx} className="truncate">
                    <strong className="text-[#292722]">{item.title}</strong> at {item.company} ({item.location || 'Remote'})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#D9CFC2] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#73685B] hover:text-[#292722] rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={previewItems.length === 0 || isProcessing}
            onClick={handleImport}
            className="inline-flex items-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] disabled:opacity-50 text-[#FAF7F2] text-xs font-medium rounded-md transition-colors"
          >
            {isProcessing ? 'Evaluating & Importing...' : `Import ${previewItems.length} Opportunities`}
          </button>
        </div>
      </div>
    </div>
  )
}
