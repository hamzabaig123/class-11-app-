'use client'

import { useState } from 'react'
import { Search, BookOpen, FileQuestion, Lightbulb, Settings, Upload, MessageCircle, ExternalLink, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Lightbulb,
    articles: [
      {
        title: 'Welcome to MCQ Master',
        description: 'Learn the basics and set up your study workspace',
        content: `
# Welcome to MCQ Master

MCQ Master is your AI-powered study companion for mastering multiple-choice questions.

## Key Features
- **Question Library**: Organize and manage your MCQ collection
- **AI Studio**: Import questions from PDFs, images, and documents
- **Practice Sessions**: Adaptive practice with spaced repetition
- **Revision Planner**: Smart scheduling based on your progress
- **Analytics**: Track your performance and identify weak areas

## Quick Start
1. Create your first subject in the Question Library
2. Add questions manually or import them using AI Studio
3. Start a practice session to begin learning
4. Review due questions daily for optimal retention
        `,
      },
      {
        title: 'Creating Your First Question',
        description: 'Step-by-step guide to adding questions manually',
        content: `
# Creating Your First Question

## Manual Creation
1. Navigate to **Questions** → **New Question**
2. Enter your question text
3. Add 4 options (A, B, C, D)
4. Select the correct answer
5. (Optional) Add explanation and hints
6. Assign a subject and difficulty level
7. Click **Create Question**

## Best Practices
- Write clear, unambiguous questions
- Ensure all options are plausible
- Provide detailed explanations
- Use proper subject categorization
        `,
      },
    ],
  },
  {
    id: 'ai-studio',
    title: 'AI Studio',
    icon: Upload,
    articles: [
      {
        title: 'Importing Questions from PDFs',
        description: 'How to extract MCQs from your documents',
        content: `
# Importing Questions from PDFs

## Supported File Types
- **PDF**: Text-based PDFs work best
- **DOCX**: Word documents
- **Images**: PNG, JPG (uses OCR)
- **Text**: Plain text files

## Upload Process
1. Go to **AI Studio** → **Upload**
2. Drag and drop your file or click to browse
3. Wait for processing (usually 30-60 seconds)
4. Review extracted questions
5. Approve, edit, or reject each question
6. Approved questions are added to your library

## Troubleshooting Failed Imports

### No Questions Found
**Causes:**
- Document is scanned (image-based) without OCR
- Questions aren't in recognizable format
- Multi-column layout confused the parser
- File is corrupted or password-protected

**Solutions:**
- Re-scan with higher quality
- Use OCR mode if available
- Convert to text-based PDF
- Try manually creating questions

### Extraction Failed
**Causes:**
- Unsupported file format
- File size too large (>50MB)
- Network timeout
- Server processing error

**Solutions:**
- Check file format and size
- Try splitting large documents
- Retry the upload
- Contact support if issue persists

## Supported Question Formats
The AI recognizes these patterns:
- Standard A-D options: \`A. Option text\`
- Numbered options: \`1) Option text\`
- Parentheses: \`(A) Option text\`
- Multi-line questions and options
        `,
      },
      {
        title: 'Computer Science MCQ Imports',
        description: 'Special handling for technical content',
        content: `
# Computer Science MCQ Imports

## Technical Content Preservation
When importing computer science questions, MCQ Master preserves:
- Programming syntax (C++, Java, Python, etc.)
- SQL statements and queries
- File paths and command-line syntax
- Operators and special characters
- Code blocks and formatting

## Tips for Better Results
1. Ensure code is properly formatted in the source
2. Use monospace fonts for code in PDFs
3. Keep code snippets on single pages when possible
4. Verify option labels (A, B, C, D) are clear

## Review Before Approval
Always check:
- Code syntax is preserved correctly
- Special characters aren't corrupted
- Indentation is maintained
- Correct answer is properly detected
        `,
      },
    ],
  },
  {
    id: 'practice',
    title: 'Practice & Revision',
    icon: BookOpen,
    articles: [
      {
        title: 'Practice Modes Explained',
        description: 'Understanding different practice session types',
        content: `
# Practice Modes

## Quick Practice
- 10-20 random questions
- Mix of difficulties
- Good for daily warm-up
- No timer pressure

## Subject-Focused
- Questions from one subject only
- Useful for exam preparation
- Can filter by topic
- Customizable question count

## Revision Mode
- Shows questions due for review
- Based on spaced repetition
- Adapts to your performance
- Most effective for retention

## Exam Simulation
- Timed practice
- Exam-like conditions
- Random question order
- Detailed performance report

## Weak Areas
- Targets concepts you struggle with
- Adaptive difficulty
- Focused improvement
- Progress tracking
        `,
      },
      {
        title: 'Spaced Repetition System',
        description: 'How MCQ Master schedules your reviews',
        content: `
# Spaced Repetition System

## How It Works
MCQ Master uses a scientifically-proven algorithm to schedule reviews:

1. **New**: First time seeing the question
2. **Learning**: Getting familiar (reviewed within 1-3 days)
3. **Review**: Mastering (intervals increase: 1 week, 2 weeks, 1 month)
4. **Mastered**: Long-term retention (3+ months)

## Answer Impact
- **Correct**: Interval increases (easier = bigger increase)
- **Incorrect**: Returns to Learning stage
- **Hint Used**: Smaller interval increase

## Daily Reviews
- Check "Due Today" on dashboard
- Review questions at scheduled times
- Best practice: 10-20 minutes daily
- Consistency beats marathon sessions

## Settings
Customize in **Settings** → **Study Preferences**:
- Daily question goal
- Mastery threshold
- Ease factor
- Review interval multipliers
        `,
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: FileQuestion,
    articles: [
      {
        title: 'Common Issues & Solutions',
        description: 'Quick fixes for frequent problems',
        content: `
# Common Issues

## Import Shows 0 Questions
**Status: Processing**
- Wait 30-60 seconds
- Refresh the page
- Check file size (<50MB)

**Status: Failed**
- File may be corrupted
- Wrong format or scanned PDF
- Try OCR mode or different file

**Status: Completed with 0**
- No MCQ patterns found
- Questions not in A-D format
- Try manual entry

## Questions Not Saving
- Check internet connection
- Ensure all required fields filled
- Try refreshing the page
- Check browser console for errors

## Practice Session Not Loading
- Clear browser cache
- Check if questions exist in subject
- Try different browser
- Restart practice session

## Slow Performance
- Too many browser tabs open
- Large import still processing
- Clear browser cache
- Close unused applications

## Data Not Syncing
- Check internet connection
- Refresh the page
- Log out and log back in
- Check account status
        `,
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Account',
    icon: Settings,
    articles: [
      {
        title: 'Customizing Your Experience',
        description: 'Personalize MCQ Master to match your study style',
        content: `
# Settings & Customization

## Study Preferences
- **Daily Goal**: Set questions per day
- **Practice Mode**: Default session type
- **Timer**: Enable/disable countdown
- **Explanations**: Show immediately or after session
- **Hints**: Allow, restrict, or disable

## Notifications
- Due review reminders
- Daily goal notifications
- Import completion alerts
- Weekly progress summary

## Data Management
- Export your question library
- Backup your progress
- Delete account data
- Data retention policy

## Theme & Display
- Light/Dark mode
- Font size
- Compact/Comfortable view
- Language preferences
        `,
      },
    ],
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<any>(null)

  const allArticles = helpCategories.flatMap((cat) =>
    cat.articles.map((article) => ({ ...article, category: cat.title, categoryId: cat.id }))
  )

  const filteredArticles = searchQuery
    ? allArticles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers, learn features, and get the most out of MCQ Master
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="mt-4 space-y-2 max-h-[400px] overflow-auto">
              {filteredArticles.length > 0 ? (
                filteredArticles.map((article, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedArticle(article)
                      setSearchQuery('')
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium">{article.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{article.description}</p>
                        <Badge variant="outline" className="mt-2">
                          {article.category}
                        </Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No articles found for "{searchQuery}"</p>
                  <Button variant="link" className="mt-2" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Article View */}
      {selectedArticle ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Badge variant="outline">{selectedArticle.category}</Badge>
                <CardTitle>{selectedArticle.title}</CardTitle>
                <CardDescription>{selectedArticle.description}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedArticle(null)}>
                Back to categories
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap">{selectedArticle.content}</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Categories */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {helpCategories.map((category) => {
              const Icon = category.icon
              return (
                <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                    </div>
                    <CardDescription>{category.articles.length} articles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.articles.map((article, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors text-sm"
                          onClick={() =>
                            setSelectedArticle({ ...article, category: category.title, categoryId: category.id })
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{article.title}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Still Need Help?</CardTitle>
              <CardDescription>Additional resources and support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" className="justify-start h-auto py-4">
                  <MessageCircle className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Contact Support</p>
                    <p className="text-xs text-muted-foreground">Get help from our team</p>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-4" asChild>
                  <a href="https://github.com/yourusername/mcq-master" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">Documentation</p>
                      <p className="text-xs text-muted-foreground">Full developer docs</p>
                    </div>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
