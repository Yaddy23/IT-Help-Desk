import mongoose, { Schema } from 'mongoose'

export interface IKnowledgeBase {
  _id: mongoose.Types.ObjectId
  title: string
  slug: string
  category: string
  content: string
  tags: string[]
  author: mongoose.Types.ObjectId
  viewCount: number
  isPublished: boolean
  helpfulYes: number
  helpfulNo: number
  createdAt: Date
  updatedAt: Date
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const kbSchema = new Schema<IKnowledgeBase>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, default: 'general' },
    content: { type: String, required: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    viewCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    helpfulYes: { type: Number, default: 0 },
    helpfulNo: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// Slug stays unique even when the title (and thus slug) changes.
kbSchema.pre('validate', function ensureSlug() {
  if (this.isModified('title') && this.title) {
    const base = slugify(this.title) || 'article'
    this.slug = `${base}-${Date.now().toString(36).slice(-4)}`
  }
})

export const KnowledgeBase = mongoose.model<IKnowledgeBase>('KnowledgeBase', kbSchema)
