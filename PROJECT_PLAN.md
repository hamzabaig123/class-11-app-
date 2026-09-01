# MCQ Master - Project Plan

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (Credentials + OAuth)
- **Styling**: Tailwind CSS
- **API**: Next.js Server Actions + tRPC for type-safe APIs
- **State**: React Query (TanStack Query) for server state
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Radix UI primitives + custom components

## Project Structure
```
mcq-master/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── signin/
│   │   │   └── signup/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── questions/
│   │   │   ├── ai-studio/
│   │   │   ├── revision/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   └── trpc/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/
│   │   ├── questions/
│   │   ├── revision/
│   │   ├── analytics/
│   │   └── layout/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── trpc/
│   │   └── utils.ts
│   ├── server/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── trpc/
│   ├── hooks/
│   ├── types/
│   └── styles/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── .env.example
```

## Database Schema (Prisma)

### Core Models
1. **User** - Authentication, profile, settings
2. **Session** - NextAuth sessions
3. **Account** - OAuth accounts
4. **VerificationToken** - Email verification
5. **Subject** - Top-level syllabus organization
6. **Topic** - Chapters within subjects
7. **Question** - MCQ content
8. **QuestionOption** - A, B, C, D options
9. **QuestionAnswer** - Correct answer + explanation
10. **QuestionTag** - Flexible tagging
11. **Attempt** - User's answer submissions
12. **ReviewItem** - Spaced repetition scheduling
13. **PracticeSession** - In-progress/completed sessions
14. **ActivityEvent** - Learning trail
15. **Import** - AI Studio imports
16. **ImportedQuestion** - Staged import questions
17. **UserSettings** - Preferences, timezone, etc.

## Phase 1: Foundation (Week 1)
- [ ] Initialize Next.js project
- [ ] Configure TypeScript, Tailwind, ESLint, Prettier
- [ ] Set up Prisma with PostgreSQL
- [ ] Create database schema
- [ ] Run initial migration
- [ ] Set up NextAuth.js
- [ ] Create tRPC server/client
- [ ] Build base UI components (Button, Card, Input, etc.)

## Phase 2: Authentication & Layout (Week 1-2)
- [ ] Sign in / Sign up pages
- [ ] Protected route middleware
- [ ] Authenticated layout (Sidebar, TopBar, MobileNav)
- [ ] Profile menu with avatar
- [ ] Session management

## Phase 3: Dashboard Backend (Week 2)
- [ ] Dashboard summary procedure
- [ ] Recent activity procedure
- [ ] Subject list procedure
- [ ] Mutation: create subject
- [ ] Mutation: create question
- [ ] Mutation: submit attempt

## Phase 4: Dashboard Frontend (Week 2-3)
- [ ] Dashboard page with all sections
- [ ] DashboardHeader (title, avatar, study brief)
- [ ] QuickActions (Add MCQ, Import)
- [ ] ProgressMetricCards (4 cards)
- [ ] EmptyWorkspaceCard
- [ ] RecentActivityCard
- [ ] SyllabusCard
- [ ] Loading skeletons
- [ ] Error states

## Phase 5: Question Library (Week 3)
- [ ] Questions list page
- [ ] Question card/component
- [ ] Create question dialog/page
- [ ] Question detail view
- [ ] Filter by subject/topic/tag
- [ ] Search functionality

## Phase 6: AI Studio / Import (Week 3-4)
- [ ] Import page
- [ ] File upload (PDF, DOCX, TXT, Images)
- [ ] Import review interface
- [ ] Approve/reject imported questions
- [ ] Background processing queue

## Phase 7: Revision & Practice (Week 4)
- [ ] Revision page (due queue)
- [ ] Practice session page
- [ ] Question renderer (MCQ)
- [ ] Answer submission
- [ ] Session persistence
- [ ] Spaced repetition algorithm

## Phase 8: Analytics (Week 4-5)
- [ ] Analytics page
- [ ] Accuracy trends
- [ ] Mastery progress
- [ ] Study time charts
- [ ] Subject breakdown
- [ ] Streak calendar

## Phase 9: Settings & Polish (Week 5)
- [ ] Settings page
- [ ] Profile management
- [ ] Notification preferences
- [ ] Data export/import
- [ ] Accessibility audit
- [ ] Mobile responsiveness
- [ ] Performance optimization

## Dependencies
```
Foundation → Auth/Layout → Dashboard Backend → Dashboard Frontend
                                                            ↓
Question Library ← AI Studio ← Revision/Practice ← Analytics
                                                            ↓
                                                      Settings/Polish
```

## Key Technical Decisions

### Spaced Repetition Algorithm (SM-2 variant)
- Initial interval: 1 day
- After correct: interval × ease factor (default 2.5)
- After incorrect: reset to 1 day
- Minimum ease factor: 1.3

### Mastery Definition
- Question mastered after 3 correct attempts with increasing intervals
- Configurable threshold in UserSettings

### Timezone Handling
- Store all timestamps in UTC
- User timezone in UserSettings
- "Due today" calculated in user's local day

### Security
- All mutations validate ownership
- Rate limiting on auth endpoints
- Input sanitization on all user content
- Secure HTTP-only cookies
- CSRF protection via NextAuth

## API Contract (tRPC)

### Dashboard Router
```typescript
dashboard: {
  summary: procedure.query(() => DashboardSummary),
  recentActivity: procedure.input(z.object({ limit: z.number().default(10) })).query(),
}
```

### Questions Router
```typescript
questions: {
  list: procedure.input(QuestionFilters).query(),
  get: procedure.input(z.object({ id: z.string() })).query(),
  create: procedure.input(CreateQuestionSchema).mutation(),
  update: procedure.input(UpdateQuestionSchema).mutation(),
  delete: procedure.input(z.object({ id: z.string() })).mutation(),
}
```

### Subjects Router
```typescript
subjects: {
  list: procedure.query(),
  create: procedure.input(CreateSubjectSchema).mutation(),
  update: procedure.input(UpdateSubjectSchema).mutation(),
  delete: procedure.input(z.object({ id: z.string() })).mutation(),
}
```

### Attempts Router
```typescript
attempts: {
  submit: procedure.input(SubmitAttemptSchema).mutation(),
  list: procedure.input(AttemptFilters).query(),
}
```

### Revision Router
```typescript
revision: {
  dueQueue: procedure.query(),
  startSession: procedure.mutation(),
  submitAnswer: procedure.input(SubmitRevisionAnswerSchema).mutation(),
  completeSession: procedure.input(z.object({ sessionId: z.string() })).mutation(),
}
```

### Imports Router
```typescript
imports: {
  create: procedure.input(CreateImportSchema).mutation(),
  get: procedure.input(z.object({ id: z.string() })).query(),
  list: procedure.query(),
  approve: procedure.input(z.object({ importId: z.string(), questionIds: z.string().array() })).mutation(),
}
```

## Environment Variables
```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
UPLOAD_SECRET="..."
UPLOAD_BUCKET="..."
```

## Testing Strategy
- Unit tests for utilities and algorithms
- Integration tests for tRPC procedures
- E2E tests for critical flows (auth, create question, practice session)
- Visual regression for Dashboard components