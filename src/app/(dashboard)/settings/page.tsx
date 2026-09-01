'use client'

import { useState, useEffect } from 'react'
import { User, Bell, Palette, Settings, Shield, Save, Loader2, Trash2, LogOut, Clock, BookOpen, Target, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland'
]

const THEMES = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'DARK', label: 'Dark' },
]

const PRACTICE_MODES = [
  { value: 'QUICK', label: 'Quick Practice' },
  { value: 'SUBJECT', label: 'By Subject' },
  { value: 'WEAK', label: 'Weak Areas' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'MOCK', label: 'Mock Test' },
]

export default function SettingsPage() {
  const { data, isLoading } = trpc.settings.get.useQuery()
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => toast({ title: 'Settings saved', description: 'Your preferences have been updated.' }),
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  })
  const updateNotifications = trpc.settings.updateNotifications.useMutation({
    onSuccess: () => toast({ title: 'Notifications updated', description: 'Your notification preferences have been saved.' }),
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  })
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => toast({ title: 'Profile updated', description: 'Your profile has been updated.' }),
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  })

  const userSettings = data?.userSettings ?? null
  const notificationSettings = data?.notificationSettings ?? null
  const user = data?.user ?? null

  const [formData, setFormData] = useState({
    name: user?.name ?? '',
    timezone: userSettings?.timezone ?? 'UTC',
    theme: (userSettings?.theme ?? 'SYSTEM') as string,
    dailyQuestionGoal: userSettings?.dailyQuestionGoal ?? 20,
    dailyMinuteGoal: userSettings?.dailyMinuteGoal ?? 30,
    defaultPracticeMode: userSettings?.defaultPracticeMode ?? 'QUICK',
    defaultQuestionCount: userSettings?.defaultQuestionCount ?? 10,
    timerPreference: userSettings?.timerPreference ?? 'OFF',
    defaultDifficulty: userSettings?.defaultDifficulty ?? 'MEDIUM',
    explanationPreference: userSettings?.explanationPreference ?? 'IMMEDIATE',
    hintPreference: userSettings?.hintPreference ?? 'ALLOWED',
    weekendReview: userSettings?.weekendReview ?? 'NORMAL',
    emailNotifications: userSettings?.emailNotifications ?? true,
    pushNotifications: userSettings?.pushNotifications ?? false,
    dailyReminder: userSettings?.dailyReminder ?? false,
    reminderTime: userSettings?.reminderTime ?? '09:00',
    masteryThreshold: userSettings?.masteryThreshold ?? 3,
    easeFactorDefault: userSettings?.easeFactorDefault ?? 2.5,
    dueReviewEnabled: notificationSettings?.dueReviewEnabled ?? true,
    dailyGoalEnabled: notificationSettings?.dailyGoalEnabled ?? true,
    inAppEnabled: notificationSettings?.inAppEnabled ?? true,
    preferredHour: notificationSettings?.preferredHour ?? 9,
  })

  const revokeAllSessions = trpc.settings.revokeAllSessions.useMutation({
    onSuccess: () => toast({ title: 'Sessions revoked', description: 'All other sessions have been terminated.' }),
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const handleSave = () => {
    updateSettings.mutate({
      timezone: formData.timezone,
      theme: formData.theme as any,
      dailyQuestionGoal: formData.dailyQuestionGoal,
      dailyMinuteGoal: formData.dailyMinuteGoal,
      defaultPracticeMode: formData.defaultPracticeMode as any,
      defaultQuestionCount: formData.defaultQuestionCount,
      timerPreference: formData.timerPreference as any,
      defaultDifficulty: formData.defaultDifficulty as any,
      explanationPreference: formData.explanationPreference as any,
      hintPreference: formData.hintPreference as any,
      weekendReview: formData.weekendReview as any,
      masteryThreshold: formData.masteryThreshold,
      easeFactorDefault: formData.easeFactorDefault,
      emailNotifications: formData.emailNotifications,
      pushNotifications: formData.pushNotifications,
      dailyReminder: formData.dailyReminder,
      reminderTime: formData.reminderTime,
    })
    updateProfile.mutate({ name: formData.name })
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><div className="h-4 bg-muted rounded w-32 animate-pulse" /></CardHeader>
              <CardContent><div className="h-10 bg-muted rounded animate-pulse" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, preferences, and security</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1 inline" />Profile</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-1 inline" />Appearance</TabsTrigger>
          <TabsTrigger value="study"><Target className="h-4 w-4 mr-1 inline" />Study</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1 inline" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1 inline" />Security</TabsTrigger>
          <TabsTrigger value="danger"><Trash2 className="h-4 w-4 mr-1 inline" />Danger</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.image ?? ''} alt={formData.name} />
                  <AvatarFallback className="text-2xl">
                    {formData.name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{formData.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">credentials</p>
                  <Button variant="outline" size="sm" className="mt-1">Change Avatar</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email ?? ''} disabled />
                <p className="text-sm text-muted-foreground">Email cannot be changed</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how MCQ Master looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={formData.theme} onValueChange={v => setFormData(p => ({ ...p, theme: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={formData.timezone} onValueChange={v => setFormData(p => ({ ...p, timezone: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Used for streak calculation and scheduling</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="study">
          <Card>
            <CardHeader>
              <CardTitle>Study Preferences</CardTitle>
              <CardDescription>Configure your learning experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dailyQuestionGoal">Daily Question Goal</Label>
                <Input id="dailyQuestionGoal" type="number" min={1} value={formData.dailyQuestionGoal} onChange={e => setFormData(p => ({ ...p, dailyQuestionGoal: parseInt(e.target.value) || 20 }))} />
                <p className="text-sm text-muted-foreground">Questions you aim to complete each day</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyMinuteGoal">Daily Study Time Goal (minutes)</Label>
                <Input id="dailyMinuteGoal" type="number" min={1} value={formData.dailyMinuteGoal} onChange={e => setFormData(p => ({ ...p, dailyMinuteGoal: parseInt(e.target.value) || 30 }))} />
              </div>
              <div className="space-y-2">
                <Label>Default Practice Mode</Label>
                <Select value={formData.defaultPracticeMode} onValueChange={v => setFormData(p => ({ ...p, defaultPracticeMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRACTICE_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultQuestionCount">Default Question Count</Label>
                <Select value={formData.defaultQuestionCount.toString()} onValueChange={v => setFormData(p => ({ ...p, defaultQuestionCount: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30, 50].map(n => <SelectItem key={n} value={n.toString()}>{n} questions</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timer Preference</Label>
                <Select value={formData.timerPreference} onValueChange={v => setFormData(p => ({ ...p, timerPreference: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFF">Off</SelectItem>
                    <SelectItem value="ELAPSED">Elapsed Time</SelectItem>
                    <SelectItem value="COUNTDOWN">Countdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Difficulty</Label>
                <Select value={formData.defaultDifficulty} onValueChange={v => setFormData(p => ({ ...p, defaultDifficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Show Explanations</Label>
                <Select value={formData.explanationPreference} onValueChange={v => setFormData(p => ({ ...p, explanationPreference: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">Immediately after answer</SelectItem>
                    <SelectItem value="END_OF_SESSION">At end of session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Show Hints</Label>
                <Select value={formData.hintPreference} onValueChange={v => setFormData(p => ({ ...p, hintPreference: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLOWED">Allowed</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weekend Review</Label>
                <Select value={formData.weekendReview} onValueChange={v => setFormData(p => ({ ...p, weekendReview: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="REDUCED">Reduced</SelectItem>
                    <SelectItem value="OFF">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="masteryThreshold">Mastery Threshold</Label>
                <Select value={formData.masteryThreshold.toString()} onValueChange={v => setFormData(p => ({ ...p, masteryThreshold: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <SelectItem key={n} value={n.toString()}>{n} correct attempts</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="easeFactorDefault">Default Ease Factor</Label>
                <Select value={formData.easeFactorDefault.toString()} onValueChange={v => setFormData(p => ({ ...p, easeFactorDefault: parseFloat(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1.3, 1.5, 1.7, 2.0, 2.5, 2.8, 3.0].map(n => <SelectItem key={n} value={n.toString()}>{n}x interval increase</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Due Review Reminders</p><p className="text-sm text-muted-foreground">Get notified about scheduled reviews</p></div>
                  <Switch checked={formData.dueReviewEnabled} onCheckedChange={(c) => setFormData(p => ({ ...p, dueReviewEnabled: c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Daily Goal Reminder</p><p className="text-sm text-muted-foreground">Remind you about incomplete daily goals</p></div>
                  <Switch checked={formData.dailyGoalEnabled} onCheckedChange={(c) => setFormData(p => ({ ...p, dailyGoalEnabled: c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Practice Completion</p><p className="text-sm text-muted-foreground">Notify when you complete a practice session</p></div>
                  <Switch checked={formData.pushNotifications} onCheckedChange={(c) => setFormData(p => ({ ...p, pushNotifications: c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">In-App Notifications</p><p className="text-sm text-muted-foreground">Show notifications within the app</p></div>
                  <Switch checked={formData.inAppEnabled} onCheckedChange={(c) => setFormData(p => ({ ...p, inAppEnabled: c }))} />
                </div>
                {formData.dailyReminder && (
                  <div className="space-y-2 ml-10">
                    <Label htmlFor="reminderTime">Reminder Time</Label>
                    <Input id="reminderTime" type="time" value={formData.reminderTime} onChange={e => setFormData(p => ({ ...p, reminderTime: e.target.value }))} />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Sessions</CardTitle>
              <CardDescription>Manage your active sessions and account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">Active on this browser</p>
                </div>
                <span className="text-sm text-green-600">● Active</span>
              </div>
              <Button variant="outline" className="w-full" onClick={() => revokeAllSessions.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />Sign out all other sessions
              </Button>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-600">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive" size="sm">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-600">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive" size="sm">Delete Account</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-600">Export My Data</p>
                  <p className="text-sm text-muted-foreground">Download a copy of all your data</p>
                </div>
                <Button variant="outline" size="sm">Export Data</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}