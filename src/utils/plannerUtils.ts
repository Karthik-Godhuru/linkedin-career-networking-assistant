import type { ContentRecommendationRecord, ContentStatus } from '../types/contentPlanner'

/**
 * Returns the YYYY-MM-DD string for a given Date in local time.
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Given any reference Date, returns the Monday of that week as a YYYY-MM-DD string.
 */
export function getMondayOfWeek(referenceDate: Date = new Date()): string {
  const d = new Date(referenceDate)
  const day = d.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return toLocalDateString(d)
}

/**
 * Adds N days to a YYYY-MM-DD date string and returns the new YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toLocalDateString(date)
}

export interface WeeklySlotInfo {
  slotNumber: 1 | 2
  dayName: 'Tuesday' | 'Thursday'
  dateStr: string
  label: string
  recommendedTime: string
}

/**
 * Returns the two planned posting slots for the week starting at `mondayDateStr`:
 * Slot 1 = Tuesday (Monday + 1 day)
 * Slot 2 = Thursday (Monday + 3 days)
 * Optimal LinkedIn publishing times per industry research: 08:30 AM - 10:00 AM local.
 */
export function getWeeklySlots(mondayDateStr: string): [WeeklySlotInfo, WeeklySlotInfo] {
  const tuesdayStr = addDays(mondayDateStr, 1)
  const thursdayStr = addDays(mondayDateStr, 3)

  return [
    {
      slotNumber: 1,
      dayName: 'Tuesday',
      dateStr: tuesdayStr,
      label: 'Slot 1 (Tuesday)',
      recommendedTime: '08:30 AM',
    },
    {
      slotNumber: 2,
      dayName: 'Thursday',
      dateStr: thursdayStr,
      label: 'Slot 2 (Thursday)',
      recommendedTime: '08:30 AM',
    },
  ]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Formats a YYYY-MM-DD string into a human-readable format, e.g. "Tue, Oct 27".
 */
export function formatSlotDate(dateStr: string): string {
  if (!dateStr) return 'Unscheduled'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dayName = DAY_NAMES[date.getDay()]
  const monthName = MONTH_NAMES[date.getMonth()]
  return `${dayName}, ${monthName} ${d}`
}

/**
 * Formats a week range, e.g. "Oct 26 - Nov 01, 2026"
 */
export function formatWeekRange(mondayDateStr: string): string {
  const sundayStr = addDays(mondayDateStr, 6)
  const [y1, m1, d1] = mondayDateStr.split('-').map(Number)
  const [y2, m2, d2] = sundayStr.split('-').map(Number)
  const start = new Date(y1, m1 - 1, d1)
  const end = new Date(y2, m2 - 1, d2)

  const startMonth = MONTH_NAMES[start.getMonth()]
  const endMonth = MONTH_NAMES[end.getMonth()]

  if (startMonth === endMonth) {
    return `${startMonth} ${String(d1).padStart(2, '0')} - ${String(d2).padStart(2, '0')}, ${y2}`
  }
  return `${startMonth} ${String(d1).padStart(2, '0')} - ${endMonth} ${String(d2).padStart(2, '0')}, ${y2}`
}

/**
 * Calculates engagement rate percentage: ((reactions + comments + reposts) / impressions) * 100
 */
export function calculateEngagementRate(
  impressions: number,
  reactions: number,
  comments: number,
  reposts: number
): number {
  if (impressions <= 0) return 0
  const totalEngagements = reactions + comments + reposts
  const rate = (totalEngagements / impressions) * 100
  return Math.round(rate * 100) / 100
}

export interface SlotReminderNotification {
  postId: string
  topic: string
  slotNumber: number
  scheduledDate: string
  status: ContentStatus
  isOverdue: boolean
  isToday: boolean
}

/**
 * Checks all active posts and identifies any that need attention today or are past due.
 * Note: Reminders are in-app and trigger while the application is open.
 */
export function checkPublishingReminders(
  posts: ContentRecommendationRecord[],
  todayStr: string = toLocalDateString(new Date())
): SlotReminderNotification[] {
  const reminders: SlotReminderNotification[] = []

  for (const post of posts) {
    // Only remind for approved or draft posts that have a scheduled date
    if (post.draft_status !== 'approved' && post.draft_status !== 'draft') {
      continue
    }

    if (!post.scheduled_date) continue

    if (post.scheduled_date === todayStr) {
      reminders.push({
        postId: post.id,
        topic: post.topic,
        slotNumber: post.slot_number || 1,
        scheduledDate: post.scheduled_date,
        status: post.draft_status,
        isOverdue: false,
        isToday: true,
      })
    } else if (post.scheduled_date < todayStr) {
      reminders.push({
        postId: post.id,
        topic: post.topic,
        slotNumber: post.slot_number || 1,
        scheduledDate: post.scheduled_date,
        status: post.draft_status,
        isOverdue: true,
        isToday: false,
      })
    }
  }

  return reminders
}
