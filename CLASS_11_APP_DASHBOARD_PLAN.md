# Class 11 App Dashboard Plan

**Prepared for:** Existing Class 11 App website  
**Current project profile:** Next.js 14, React, TypeScript, Prisma, SQLite, NextAuth, Tailwind CSS, and a question-practice data model  
**Working product identity:** A Class 11 learning and MCQ practice platform

## 1. Dashboard Purpose

The dashboard should be the student’s daily learning command center. Its main job is to answer four questions immediately: what should I study today, how am I performing, which topics are weak, and what can I do next? The dashboard must reduce unnecessary navigation and make the next useful action obvious.

The existing data model already supports subjects, topics, chapters, questions, attempts, practice sessions, review items, bookmarks, notes, collections, imports, activity events, notifications, and settings. Therefore, the dashboard should not be designed as a simple statistics page. It should connect learning activity to clear actions: start practice, continue an unfinished session, review mistakes, revise due questions, open notes, and manage content.

## 2. Main User Roles

| Role | Main goal | Dashboard emphasis | Permissions |
|---|---|---|---|
| Student | Learn, practise, revise, and improve marks | Practice, weak areas, progress, due review, bookmarks, notes | Can create personal content and view personal analytics |
| Content manager or teacher | Maintain subjects, chapters, questions, and sources | Question quality, drafts, imports, approvals, content coverage | Can create, edit, publish, archive, and review content |
| Administrator | Control the platform and monitor system health | Users, activity, content health, imports, security, settings | Can manage all users and system configuration |

If the current app is only for one student account, keep the student experience as the default and hide management modules until an administrator role is added. Do not show empty administrative menus to normal students.

## 3. Recommended Global Layout

Use a responsive application shell with a collapsible left sidebar, a top header, and a content area. On desktop, the sidebar should remain visible. On tablet and mobile, it should become a drawer opened by the menu button.

| Area | Contents | Behaviour |
|---|---|---|
| Left sidebar | Dashboard, Subjects, Practice, Review, Questions, Bookmarks, Notes, Collections, Imports, Analytics, Settings | Active page is highlighted; modules can be hidden by role |
| Top header | Sidebar toggle, global search, notifications, theme toggle, profile menu | Remains visible while the page scrolls |
| Main content | Page title, date or context line, primary action, cards, charts, lists | Uses a consistent maximum width and spacing system |
| Quick-action strip | Start Practice, Continue Session, Review Mistakes, Add Question | Placed near the top so users can act without scrolling |
| Mobile navigation | Menu drawer plus bottom action area | Prioritises Dashboard, Practice, Review, and Profile |

### Recommended visual hierarchy

Use one primary colour for the main action, one warning colour for due or weak items, one success colour for correct performance, and a neutral colour system for inactive states. Cards should not all use different bright colours. Use typography and spacing to show importance. Every page must include a visible page title, one primary action, loading state, empty state, error state, and success feedback.

## 4. Dashboard Home Screen

### 4.1 Header

The header should display “Good morning, [Name]” or a neutral welcome message, the current date, and a short progress message such as “You have 20 questions due for review.” Avoid displaying a congratulatory message that is not based on real data.

### 4.2 Primary quick actions

| Button | Function | Result |
|---|---|---|
| **Start Practice** | Opens the practice setup panel | User selects subject, chapter, topic, difficulty, question count, mode, and time limit |
| **Continue Practice** | Reopens the most recent active or paused session | Returns the user to the exact unanswered question and preserves progress |
| **Review Mistakes** | Creates a practice session from recently incorrect attempts | Shows wrong answers first and provides explanations after submission |
| **Review Due** | Opens the spaced-review queue | Starts questions whose `nextReviewAt` date is due |
| **Add Question** | Opens the question editor | Allows manual creation of a question, options, answer, explanation, tags, and source |
| **Import Questions** | Opens the import workflow | Allows PDF, document, or supported file upload, extraction, review, and approval |

The screen should show only the most relevant three or four actions on small screens. Secondary actions can be placed inside a “More actions” menu.

### 4.3 KPI cards

| Card | Calculation | Click action |
|---|---|---|
| Questions attempted | Count of attempts for the selected date range | Opens analytics filtered to attempts |
| Accuracy | Correct attempts divided by total attempts | Opens performance details |
| Current streak | Consecutive days with at least one completed attempt | Opens activity history |
| Due for review | Review items where `nextReviewAt` is today or earlier | Opens Review page |
| Practice time | Sum of recorded `timeSpentMs` | Opens time and activity analytics |
| Questions bookmarked | Count of active bookmarks | Opens Bookmarks |

Every KPI must show its date range, such as “This week,” and must not mix all-time data with weekly data. Add a small comparison label only when the comparison period exists.

### 4.4 Progress panels

The first chart should be a seven-day activity chart showing questions answered per day. The second should be a subject performance chart showing accuracy and attempted volume. A third panel should show weak topics ranked by low accuracy, but it should require a minimum number of attempts so one accidental wrong answer does not make a topic appear weak.

### 4.5 Continue-learning panel

This panel lists active sessions from `PracticeSession` where the status is ready, active, or paused. Each row should show the session name, subject, question progress, accuracy so far, time spent, and last activity time.

Buttons are:

| Button | Function |
|---|---|
| **Resume** | Opens the session at its saved `currentIndex` |
| **View Summary** | Opens a read-only session summary |
| **Delete Session** | Opens a confirmation dialog and removes or archives the session |
| **Rename** | Opens an inline text editor for the session title |

### 4.6 Today’s study plan

The dashboard should provide an automatically generated but editable plan containing due reviews, a weak-topic practice set, and a recommended short practice session. The user must be able to remove an item, mark it complete, or change its target time. This is more useful than a static “study tips” box.

## 5. Sidebar Pages and Their Functions

| Page | Purpose | Main content | Primary button |
|---|---|---|---|
| Dashboard | Daily overview | KPIs, activity, weak areas, due review, active sessions | Start Practice |
| Subjects | Browse the curriculum | Subject cards, chapter tree, completion and accuracy | Add Subject |
| Practice | Configure and launch tests | Filters, modes, saved presets, recent sessions | Create Practice |
| Review | Revise weak and due questions | Review queue, confidence, next review date | Start Review |
| Questions | Manage question bank | Search, filters, status, difficulty, tags, bulk actions | Add Question |
| Bookmarks | Revisit saved questions | Saved questions, collections, notes, filters | Create Collection |
| Notes | Manage study notes | Categories, subject links, search, revisions | Add Note |
| Collections | Organise questions | Custom sets and collection activity | New Collection |
| Imports | Process uploaded content | Upload history, progress, errors, approval queue | Import File |
| Analytics | Understand performance | Accuracy, time, trends, subject and topic breakdown | Export Report |
| Settings | Manage account and preferences | Profile, notifications, appearance, data, security | Save Changes |

## 6. Subjects and Curriculum Experience

The Subjects page should use cards for subjects and an expandable chapter tree inside each subject. Each subject card should show the number of chapters, number of questions, completion percentage, accuracy, last studied time, and due-review count.

Buttons and functions:

| Button | Function |
|---|---|
| **Open Subject** | Displays chapters, topics, questions, notes, and subject analytics |
| **Start Subject Practice** | Opens practice setup with the subject already selected |
| **View Weak Topics** | Filters analytics and practice to weak topics in the subject |
| **Manage Chapters** | Opens chapter creation, rename, reorder, archive, and restore controls |
| **Add Topic** | Creates a topic under the selected subject or chapter |
| **Edit** | Opens the subject or chapter form |
| **Archive** | Removes the item from normal navigation without destroying linked history |

Use archive rather than hard delete for subjects, chapters, and questions that have historical attempts or review records.

## 7. Practice Workflow

The practice workflow should be a four-step setup process that can also be completed in a single compact panel.

### Step 1: Choose content

The user selects one or more subjects, chapters, topics, collections, bookmarked questions, or mistake questions. The interface should display the number of eligible questions as selections change.

### Step 2: Choose mode

| Mode | Behaviour |
|---|---|
| Quick Practice | Short random set for daily use |
| Topic Practice | Questions from selected topic or chapter |
| Mistake Practice | Questions previously answered incorrectly |
| Review Practice | Questions due according to review schedule |
| Mock Test | Timed test with a final score and summary |
| Custom Collection | Questions from a user-created collection |

### Step 3: Configure

The user chooses question count, difficulty, question type, shuffle order, time limit, hints, explanation visibility, and confidence tracking. Save these choices as a reusable preset.

### Step 4: Start

The **Start Practice** button validates that enough questions exist, creates a `PracticeSession`, saves the selection snapshot, and opens the practice player.

### Practice player controls

| Button or control | Function |
|---|---|
| **Previous** | Returns to the prior question where allowed by the mode |
| **Next** | Saves current state and moves forward |
| **Submit Answer** | Records the selected answer and creates an attempt event |
| **Flag** | Marks the question for later review within the session |
| **Bookmark** | Saves the question to personal bookmarks |
| **Hint** | Reveals the hint and records `hintUsed` |
| **Show Explanation** | Displays the explanation after answering or when allowed by settings |
| **Confidence** | Saves low, medium, or high confidence for later analysis |
| **Question Navigator** | Opens a grid showing answered, unanswered, flagged, and current questions |
| **Pause** | Saves progress and returns to the dashboard or practice list |
| **Finish Test** | Opens a confirmation dialog before final submission |
| **Exit** | Warns about unsaved progress and either saves or abandons the session |

The player must autosave after every answer and preserve the last client sequence to prevent duplicate answer events. It should also recover gracefully if the browser is refreshed.

## 8. Results and Review Summary

After a session, show the score, accuracy, number correct, number incorrect, unanswered questions, time spent, difficulty distribution, and subject or topic breakdown. The user should not have to navigate to Analytics to understand the result.

| Button | Function |
|---|---|
| **Retry Incorrect** | Creates a new session from incorrect questions |
| **Review Answers** | Shows each question with the user’s selection and correct answer |
| **Add Mistakes to Collection** | Creates or updates a “Mistakes” collection |
| **Review Later** | Adds selected questions to the review queue |
| **Back to Dashboard** | Returns to the home dashboard |
| **Export Result** | Downloads a CSV or printable summary |

## 9. Review and Spaced Revision

The Review page should use the existing `ReviewItem` fields: status, interval, ease factor, repetitions, next review date, and last reviewed date. The system should show why a question is due and allow the user to rate confidence after answering.

The review player should present the question, answer controls, explanation, source, and confidence rating. After the answer, show buttons such as **Again**, **Hard**, **Good**, and **Easy**. These controls update the next review date according to the app’s chosen review algorithm and record the result.

The page should include filters for due today, overdue, new, difficult, recently wrong, subject, chapter, and confidence. A progress bar should show “12 of 20 reviewed” rather than only showing a percentage.

## 10. Question Bank

The Questions page is the central content-management area. It should support table view on desktop and card view on mobile. The table should include question text preview, subject, chapter, topic, difficulty, status, source, updated date, and performance.

| Button | Function |
|---|---|
| **Add Question** | Opens a validated question editor |
| **Edit** | Updates question text, options, answer, explanation, hint, difficulty, tags, and classification |
| **Duplicate** | Creates a new draft with copied content and a new ID |
| **Preview** | Shows the question as a student sees it |
| **Publish** | Changes a valid draft to published after validation |
| **Archive** | Hides the question while retaining historical attempts |
| **Restore** | Re-activates an archived question |
| **Bookmark** | Adds or removes the question from personal bookmarks |
| **Add to Collection** | Opens a collection selector |
| **Bulk Edit** | Applies tags, status, subject, chapter, or difficulty to selected questions |
| **Bulk Export** | Downloads selected questions in CSV or JSON |
| **Delete** | Requires confirmation and should be restricted to records without dependent history |

Question validation must require question text, at least two options, one correct option, a valid classification where applicable, and a clear status. Draft questions should not appear in normal practice unless the user explicitly enables draft content.

## 11. Notes, Bookmarks, and Collections

These features should work together rather than as isolated pages. A question detail panel should offer **Bookmark**, **Add to Collection**, **Create Note**, and **View Related Notes** actions.

Notes should support title, rich text or Markdown, category, subject, chapter, topic, linked questions, search, pinning, and revision history. The existing note revision model should power an **Edit History** button that lets users compare or restore previous versions.

Collections should support a name, description, colour, subject, question count, last activity, and sharing status if sharing is later introduced. The collection detail page should include **Start Practice**, **Add Questions**, **Remove Selected**, **Rename**, **Duplicate**, and **Archive**.

## 12. Import Workflow

The Imports page should make file processing transparent. The user should see the uploaded filename, type, size, upload time, processing stage, total extracted questions, approved questions, rejected questions, pending questions, and error reason.

| Stage | User-facing state | Available action |
|---|---|---|
| Uploaded | File received | View details, cancel |
| Extracting | Text is being extracted | View progress |
| Generating | Questions are being prepared | View progress |
| Review required | Questions need approval | Review questions |
| Completed | Import finished | Open questions, retry, export report |
| Failed | Processing failed | View reason, retry, delete |

The review screen should show each generated question beside its source text, page number, section, or quote when available. Buttons should include **Approve**, **Reject**, **Edit**, **Approve All Valid**, **Reject Selected**, and **Retry Failed**. Never publish imported questions automatically without a review option.

## 13. Analytics Page

Analytics should be actionable rather than decorative. Each chart needs a date range selector, subject filter, and export option.

Recommended sections are:

| Section | Metric | Action from the section |
|---|---|---|
| Overview | Attempts, accuracy, time, streak | Open filtered activity |
| Subject performance | Accuracy and volume by subject | Start practice for selected subject |
| Topic weaknesses | Low-accuracy topics with attempt count | Create weak-topic practice |
| Difficulty analysis | Performance by easy, medium, and hard | Adjust practice difficulty |
| Time analysis | Average response time and slow questions | Review slow questions |
| Confidence analysis | Confidence versus actual correctness | Review overconfident mistakes |
| Review health | Due, overdue, new, and completed review items | Start review session |
| Progress trend | Weekly and monthly improvement | Compare periods |

A date range selector should include Today, This week, This month, Last 30 days, Last 90 days, and Custom. The **Export Report** button should generate CSV first and optionally a printable report later.

## 14. Notifications and Profile Menu

The notification bell should show due reviews, completed imports, failed imports, saved session reminders, and important account messages. It should include **Mark as Read**, **Mark All as Read**, **Open Notification**, and **Notification Settings**.

The profile menu should include **Profile**, **Preferences**, **Security**, **Export My Data**, **Help**, and **Sign Out**. Sign-out should be visible but separated from ordinary actions, and it should ask for confirmation only if unsaved work exists.

## 15. New Features to Add

### A. Personalised daily study plan

Generate a daily plan from due review items, weak topics, unfinished sessions, and the user’s selected daily question target. Allow the user to edit, reorder, skip, and complete tasks.

### B. Smart weak-topic detection

Rank topics using accuracy, number of attempts, recency, difficulty, and confidence. A topic should not be labelled weak until it has enough attempts to produce a meaningful signal. Each weak-topic card should have a direct **Practise This Topic** action.

### C. Question quality score

For content managers, calculate a quality checklist based on complete options, answer validity, explanation presence, source mapping, duplicate risk, and publication status. Display warnings before publishing.

### D. Saved practice presets

Let users save configurations such as “Physics Chapter 3, 20 medium questions, 30 minutes.” Presets should appear on the dashboard and Practice page with **Start**, **Edit**, **Duplicate**, and **Delete** buttons.

### E. Mistake journal

Automatically collect incorrect questions, the user’s selected answer, correct answer, explanation, confidence, and personal note. Provide a **Why did I miss this?** note field and a **Retry Mistakes** action.

### F. Exam readiness score

Create a transparent score based on subject coverage, recent accuracy, review completion, mock-test results, and weak-topic count. Show the components so the score is not misleading or unexplained.

### G. Calendar study view

Add a calendar showing planned sessions, completed sessions, due reviews, and streak days. Each calendar item should open the associated session or review queue.

### H. Offline-safe practice recovery

If supported by the technical architecture, cache the current session state in the browser and synchronise answer events when connectivity returns. Show a clear “Saved locally” or “Synced” indicator.

### I. Question duplicate detection

Before saving or importing, compare the new question against existing text and answer options. Show possible duplicates and allow the content manager to continue, merge, or cancel.

### J. Accessibility and keyboard operation

Support keyboard navigation, visible focus states, readable contrast, labelled icon buttons, screen-reader text, and a reduced-motion preference. Every icon-only button must have a tooltip and accessible label.

## 16. Settings Plan

| Settings group | Controls |
|---|---|
| Profile | Name, email, avatar, password |
| Study preferences | Daily target, default question count, default mode, difficulty |
| Review preferences | Reminder time, review intervals, new-question limit |
| Appearance | Light/dark/system theme, compact or comfortable density |
| Notifications | Due review, import completion, reminders, activity summaries |
| Data | Export data, import data, delete account, archive options |
| Security | Active sessions, sign out other devices, password change |
| Content | Default subject, draft visibility, source requirements |

The **Save Changes** button should display a saving state, prevent duplicate submissions, validate fields, and show a clear success or error message.

## 17. Permission Matrix

| Capability | Student | Teacher/content manager | Administrator |
|---|---:|---:|---:|
| View published questions | Yes | Yes | Yes |
| Create personal questions | Yes | Yes | Yes |
| Publish shared questions | No or restricted | Yes | Yes |
| Import files | Yes for personal content | Yes | Yes |
| Manage subjects and chapters | Personal only | Yes | Yes |
| View personal analytics | Yes | Yes | Yes |
| View all-user analytics | No | Optional | Yes |
| Manage users | No | No | Yes |
| Change system settings | No | No | Yes |
| Export personal data | Yes | Yes | Yes |

Enforce permissions on the server, not only by hiding frontend buttons. A hidden button is not a security control.

## 18. Data and API Requirements

Create dashboard query endpoints that return aggregated data instead of loading every question and attempt into the browser. Recommended server responses include dashboard summary, activity trend, subject performance, weak topics, active sessions, due review count, recent activity, notifications, and import status.

Use the existing indexes on `userId`, `createdAt`, `status`, subject, topic, chapter, and review dates. For larger datasets, add carefully measured aggregate tables or cached summaries rather than recalculating every chart on every request.

All user-owned data queries must filter by the authenticated user ID. All mutations must validate input with a schema, confirm ownership, and create an activity event where useful.

## 19. Error, Empty, and Loading States

Every dashboard section must have a defined state. For example, when there are no attempts, show “Start your first practice session” with a **Start Practice** button. When there are no review items, show “You are caught up” with a **Practise a Weak Topic** button. When an import fails, show the reason and **Retry** action. Loading states should use skeletons that preserve the final layout rather than causing the page to jump.

Errors should be specific and recoverable. Replace technical messages with useful guidance, such as “The file could not be processed. Check that it is a supported PDF or document and try again.” Log technical details privately for debugging.

## 20. Recommended Implementation Order

| Phase | Work | Completion condition |
|---|---|---|
| 1 | Audit existing routes, components, schema, and authentication | Current pages and reusable UI elements are documented |
| 2 | Build the shared dashboard shell | Responsive sidebar, header, profile menu, theme, and navigation work |
| 3 | Build dashboard data queries | Summary cards, active sessions, due review, and activity load from real data |
| 4 | Build dashboard home UI | Quick actions, KPIs, charts, weak topics, and study plan are functional |
| 5 | Improve practice flow | Setup, player, autosave, pause, finish, and results work reliably |
| 6 | Build review, bookmarks, notes, and collections | Linked learning workflow works end to end |
| 7 | Improve question management and imports | CRUD, validation, bulk actions, review queue, and error handling work |
| 8 | Add analytics and exports | Filters, trends, breakdowns, and CSV export are accurate |
| 9 | Add advanced features | Presets, mistake journal, readiness score, calendar, and duplicate detection |
| 10 | Test and polish | Responsive, accessibility, security, performance, and data-integrity checks pass |

## 21. Acceptance Checklist

The dashboard is ready for release when a student can sign in, understand today’s recommended action within five seconds, start a practice session in three or fewer meaningful steps, refresh without losing a submitted answer, resume a paused session, review mistakes, bookmark a question, create a note, and see updated analytics afterward.

The system is also ready when invalid questions cannot be published, imported questions can be reviewed before use, draft content is separated from published content, archived questions do not destroy history, every user can access only permitted data, mobile navigation is usable, loading and empty states are clear, and destructive actions require confirmation.

## 22. Final Recommended Dashboard Structure

The final student navigation should be:

> **Dashboard → Subjects → Practice → Review → Questions → Bookmarks → Notes → Collections → Imports → Analytics → Settings**

The dashboard home should prioritise this order:

1. Welcome header and due-review alert.
2. Start Practice, Continue Practice, Review Mistakes, and Review Due actions.
3. KPI cards for attempts, accuracy, streak, due reviews, and time.
4. Active practice sessions.
5. Today’s study plan.
6. Seven-day activity chart.
7. Subject performance.
8. Weak topics with direct practice buttons.
9. Recent activity and notifications.

This structure is the most suitable starting point for the existing Class 11 App because it uses the project’s current MCQ, practice-session, review, notes, collections, imports, source, bookmark, and analytics concepts without requiring the product to become unnecessarily complicated.
