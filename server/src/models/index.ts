// Importing this module registers every model with Mongoose, so populate()
// can resolve refs even when only one model is imported directly.
import './Department.js'
import './User.js'
import './Ticket.js'
import './TicketComment.js'

export { Department } from './Department.js'
export type { IDepartment } from './Department.js'
export { User } from './User.js'
export type { IUser, Role } from './User.js'
export { Ticket, slaDueFor } from './Ticket.js'
export type { ITicket, IAttachment, TicketStatus, TicketPriority, TicketCategory } from './Ticket.js'
export { TicketComment } from './TicketComment.js'
export type { ITicketComment } from './TicketComment.js'
