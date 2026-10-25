import type { CandidateRawInput } from '../../types/candidate'

/**
 * Parses CSV text from exported spreadsheets or LinkedIn Connections archives.
 */
export function parseCandidatesFromCSV(csvText: string): CandidateRawInput[] {
  if (!csvText || !csvText.trim()) return []

  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Extract and normalize header line
  const rawHeaders = splitCSVLine(lines[0])
  const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/['"]/g, ''))

  // Find column indices
  const nameIdx = headers.findIndex((h) => h === 'full name' || h === 'name' || h === 'candidate')
  const firstNameIdx = headers.findIndex((h) => h.includes('first name'))
  const lastNameIdx = headers.findIndex((h) => h.includes('last name'))
  const urlIdx = headers.findIndex((h) => h.includes('url') || h.includes('link') || h.includes('profile'))
  const roleIdx = headers.findIndex((h) => h.includes('title') || h.includes('position') || h.includes('role') || h.includes('headline'))
  const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('organization') || h.includes('firm'))
  const locationIdx = headers.findIndex((h) => h.includes('location') || h.includes('city') || h.includes('country'))

  const candidates: CandidateRawInput[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i])
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue

    // Determine full name
    let fullName = ''
    if (nameIdx !== -1 && row[nameIdx]) {
      fullName = row[nameIdx].trim()
    } else if (firstNameIdx !== -1 && row[firstNameIdx]) {
      const first = row[firstNameIdx].trim()
      const last = lastNameIdx !== -1 && row[lastNameIdx] ? row[lastNameIdx].trim() : ''
      fullName = `${first} ${last}`.trim()
    }

    if (!fullName) continue

    // Determine profile URL
    const rawUrl = urlIdx !== -1 && row[urlIdx] ? row[urlIdx].trim() : ''
    const profileUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `https://www.linkedin.com/in/${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

    const headline = roleIdx !== -1 && row[roleIdx] ? row[roleIdx].trim() : undefined
    const company = companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : undefined
    const location = locationIdx !== -1 && row[locationIdx] ? row[locationIdx].trim() : undefined

    candidates.push({
      full_name: fullName,
      headline: headline || `${company ? 'Engineer at ' + company : 'Software Professional'}`,
      current_company: company,
      location: location,
      profile_url: profileUrl,
      source: 'csv_import',
    })
  }

  return candidates
}

/**
 * Handles comma-separated values with quoted string support.
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
