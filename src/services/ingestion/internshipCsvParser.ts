import type { InternshipRawInput, WorkMode } from '../../types/internship'
import { detectWorkMode } from '../internshipMatchingEngine'

/**
 * Parses CSV text containing internship opportunities.
 * Supports comma separation, quotes, and flexible column headers.
 */
export function parseInternshipsFromCSV(csvText: string): InternshipRawInput[] {
  if (!csvText || !csvText.trim()) return []

  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Extract header row
  const rawHeaders = splitCSVLine(lines[0])
  const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/['"]/g, ''))

  // Detect column indexes
  const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('role') || h.includes('position'))
  const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('org') || h.includes('employer'))
  const locationIdx = headers.findIndex((h) => h.includes('location') || h.includes('city'))
  const workModeIdx = headers.findIndex((h) => h.includes('mode') || h.includes('remote') || h.includes('type'))
  const urlIdx = headers.findIndex((h) => h.includes('url') || h.includes('link') || h.includes('posting') || h.includes('apply'))
  const deadlineIdx = headers.findIndex((h) => h.includes('deadline') || h.includes('due') || h.includes('date'))
  const skillsIdx = headers.findIndex((h) => h.includes('skill') || h.includes('tech') || h.includes('requirement'))
  const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('desc') || h.includes('summary'))

  const results: InternshipRawInput[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i])
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue

    const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx].trim() : ''
    const company = companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : ''

    // Mandatory fields
    if (!title || !company) continue

    const location = locationIdx !== -1 && row[locationIdx] ? row[locationIdx].trim() : ''
    const rawMode = workModeIdx !== -1 && row[workModeIdx] ? row[workModeIdx].trim().toLowerCase() : ''
    let workMode: WorkMode | undefined
    if (rawMode.includes('remote')) workMode = 'remote'
    else if (rawMode.includes('hybrid')) workMode = 'hybrid'
    else if (rawMode.includes('onsite') || rawMode.includes('in-office')) workMode = 'onsite'
    else workMode = detectWorkMode(location)

    const rawUrl = urlIdx !== -1 && row[urlIdx] ? row[urlIdx].trim() : ''
    const postingUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `https://${company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com/careers/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

    // Parse deadline date if present (ISO YYYY-MM-DD or readable string)
    let deadline: string | null = null
    if (deadlineIdx !== -1 && row[deadlineIdx]) {
      const dStr = row[deadlineIdx].trim()
      const parsed = new Date(dStr)
      if (!isNaN(parsed.getTime())) {
        deadline = parsed.toISOString().split('T')[0]
      }
    }

    // Parse required skills
    let requiredSkills: string[] = []
    if (skillsIdx !== -1 && row[skillsIdx]) {
      requiredSkills = row[skillsIdx]
        .split(/[;,|/]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }

    const notes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx].trim() : ''

    results.push({
      title,
      company,
      location: location || (workMode === 'remote' ? 'Remote' : 'Location Not Specified'),
      work_mode: workMode,
      posting_url: postingUrl,
      source: 'csv_import',
      required_skills: requiredSkills,
      deadline,
      notes: notes || null,
    })
  }

  return results
}

/**
 * Parses a single CSV line respecting quotes and commas.
 */
function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}
