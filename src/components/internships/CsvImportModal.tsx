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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Import Opportunities via CSV
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File picker */}
          <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 text-center">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
              id="internship-csv-upload"
            />
            <label
              htmlFor="internship-csv-upload"
              className="cursor-pointer flex flex-col items-center justify-center text-xs text-slate-400 hover:text-slate-200"
            >
              <FileText className="w-8 h-8 text-slate-500 mb-2" />
              <span className="font-semibold text-slate-200">Click to upload CSV</span> or drag and drop
              <span className="text-[11px] text-slate-500 mt-0.5">Supports spreadsheets, GitHub internship trackers, etc.</span>
            </label>
          </div>

          {/* Paste Raw CSV Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Or Paste CSV Text</label>
              <button
                type="button"
                onClick={() => handleTextChange(sampleCsvTemplate)}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline"
              >
                Insert Sample Format
              </button>
            </div>
            <textarea
              value={csvContent}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={4}
              placeholder="Title, Company, Location, Work Mode, URL, Deadline, Skills..."
              className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Preview count */}
          {previewItems.length > 0 && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Parsed {previewItems.length} valid opportunities ready for evaluation:
              </div>
              <ul className="text-xs text-slate-300 space-y-1 max-h-28 overflow-y-auto pl-2 border-l border-slate-800">
                {previewItems.map((item, idx) => (
                  <li key={idx} className="truncate">
                    <strong>{item.title}</strong> at {item.company} ({item.location || 'Remote'})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={previewItems.length === 0 || isProcessing}
            onClick={handleImport}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-blue-600/20"
          >
            {isProcessing ? 'Evaluating & Importing...' : `Import ${previewItems.length} Opportunities`}
          </button>
        </div>
      </div>
    </div>
  )
}
