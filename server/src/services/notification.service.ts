import { Notification } from '../models/Notification.js'
import { User } from '../models/index.js'
import { sendMail } from '../config/mailer.js'
import type { NotificationType } from '../models/Notification.js'

interface NotifyInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  /** Skip notifying the person who caused the event. */
  actorId?: string
}

/**
 * Creates the in-app notification row, then sends the matching email in the
 * background (failures must never break the request that triggered it).
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    if (input.actorId && input.actorId === input.userId) return
    const user = await User.findById(input.userId).select('email name notificationPrefs isActive')
    if (!user || !user.isActive) return

    await Notification.create({
      recipient: user._id,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    })

    if (user.notificationPrefs?.email !== false) {
      void sendMail(
        user.email,
        input.title,
        `<div style="font-family:sans-serif;font-size:14px;line-height:1.5">
           <p>${input.message}</p>
           ${input.link ? `<p><a href="${process.env.CLIENT_URL ?? 'http://localhost:5173'}${input.link}">Open in Help Desk</a></p>` : ''}
         </div>`,
      ).catch((err) => console.error('Email failed:', (err as Error).message))
    }
  } catch (err) {
    console.error('Notification failed:', (err as Error).message)
  }
}

/** Fire-and-forget wrapper so controllers don't await notifications. */
export function notifyAsync(input: NotifyInput): void {
  void notify(input)
}
