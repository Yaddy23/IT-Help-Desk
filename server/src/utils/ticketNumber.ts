import { Ticket } from '../models/Ticket.js'

export async function nextTicketNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `TCK-${year}-`
  const last = await Ticket.findOne({ ticketNumber: { $regex: `^${prefix}` } })
    .sort({ ticketNumber: -1 })
    .lean<{ ticketNumber: string } | null>()

  const lastSeq = last ? Number(last.ticketNumber.slice(prefix.length)) : 0
  return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`
}
