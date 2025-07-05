declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}
;("use client")

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  CalendarDays,
  Mic,
  MicOff,
  Volume2,
  Upload,
  FileAudio,
  Loader2,
} from "lucide-react"
import { ScheduledTask } from "@/types/tasks/task.type"
import { useTasks } from "@/features/tasks/provider/task-provider"
import client from "@/lib/openai-init"

interface AudioFile {
  file: File
  url: string
  duration: number
  isPlaying: boolean
}

// Utility functions
// const getDateString = (daysFromToday = 0): string => {
//   const date = new Date()
//   date.setDate(date.getDate() + daysFromToday)
//   return date.toISOString().split("T")[0]
// }

const formatDate = (dateString: string, format: "full" | "short" | "day" = "full") => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (format === "day") {
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  if (format === "short") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  if (dateString === today.toISOString().split("T")[0]) return "Today"
  if (dateString === tomorrow.toISOString().split("T")[0]) return "Tomorrow"

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200"
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "low":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

// const formatDuration = (seconds: number) => {
//   const mins = Math.floor(seconds / 60)
//   const secs = Math.floor(seconds % 60)
//   return `${mins}:${secs.toString().padStart(2, "0")}`
// }

export default function TodoList() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [viewMode, setViewMode] = useState<"day" | "week">("day")
  const [newTask, setNewTask] = useState("")
  const [newTime, setNewTime] = useState("")
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingText, setRecordingText] = useState("")
  const [speechSupported, setSpeechSupported] = useState(false)
  const [uploadedAudio, setUploadedAudio] = useState<AudioFile | null>(null)
  const [isProcessingAudio, setIsProcessingAudio] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState("")

  // Use the task provider
  const { 
    isLoading: tasksLoading,
    addTask, 
    deleteTask, 
    toggleTask, 
    addMultipleTasks,
    getTasksByDate 
  } = useTasks()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      setSpeechSupported(!!SpeechRecognition)
    }
  }, [])

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startRecording = useCallback(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setIsRecording(true)
      setRecordingText("")
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ""
      let interimTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      const fullTranscript = finalTranscript || interimTranscript
      setRecordingText(fullTranscript)

      if (finalTranscript) {
        const newTasks = parseMultipleTasks(finalTranscript)
        addMultipleTasks(newTasks)
      }
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.start()
  }, [addMultipleTasks])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  const handleFileUpload = useCallback((file: File) => {
    console.log("📁 File upload started:", {
      name: file.name,
      type: file.type,
      size: file.size,
      extension: file.name.split('.').pop()?.toLowerCase()
    })

    // Enhanced audio file detection
    const isAudioFile = file.type.startsWith("audio/") || 
                       file.name.toLowerCase().endsWith('.m4a') ||
                       file.name.toLowerCase().endsWith('.mp3') ||
                       file.name.toLowerCase().endsWith('.wav') ||
                       file.name.toLowerCase().endsWith('.aac') ||
                       file.name.toLowerCase().endsWith('.ogg') ||
                       file.name.toLowerCase().endsWith('.flac') ||
                       file.name.toLowerCase().endsWith('.webm')

    if (!isAudioFile) {
      alert(`Please upload an audio file. Received: ${file.type} (${file.name})`)
      return
    }

    // Check file size (OpenAI has a 25MB limit)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (file.size > maxSize) {
      alert(`File too large. Maximum size is 25MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    const url = URL.createObjectURL(file)
    const audio = new Audio(url)

    audio.onloadedmetadata = () => {
      setUploadedAudio({
        file,
        url,
        duration: audio.duration,
        isPlaying: false,
      })
    }

    // Process the audio file for transcription
    processAudioFile(file)
  }, [])

  const parseMultipleTasks = useCallback((transcript: string): Omit<ScheduledTask, 'id'>[] => {
    const text = transcript.toLowerCase().trim()
    const tasks: Omit<ScheduledTask, 'id'>[] = []

    // Split by common task separators
    const taskSeparators = /(?:and then|next|also|after that|then|,\s*(?:schedule|add|create|make))/i
    const potentialTasks = text.split(taskSeparators)

    potentialTasks.forEach((taskText, index) => {
      const cleanText = taskText.trim()
      if (cleanText.length < 3) return // Skip very short segments

      let taskName = cleanText
      let extractedTime = ""
      let extractedPriority: "high" | "medium" | "low" = "medium"

      // Extract time patterns
      const timePatterns = [/at (\d{1,2}):(\d{2})/i, /at (\d{1,2})\s*(am|pm)/i, /at (\d{1,2})\s*o'?clock/i]

      for (const pattern of timePatterns) {
        const match = cleanText.match(pattern)
        if (match) {
          if (match[2] && match[2].match(/\d{2}/)) {
            extractedTime = `${match[1].padStart(2, "0")}:${match[2]}`
          } else if (match[2] && (match[2] === "am" || match[2] === "pm")) {
            let hour = parseInt(match[1], 10)
            if (match[2] === "pm" && hour !== 12) hour += 12
            if (match[2] === "am" && hour === 12) hour = 0
            extractedTime = `${hour.toString().padStart(2, "0")}:00`
          } else {
            const hour = parseInt(match[1], 10)
            extractedTime = `${hour.toString().padStart(2, "0")}:00`
          }
          taskName = cleanText.replace(match[0], "").trim()
          break
        }
      }

      // Extract priority
      if (cleanText.includes("urgent") || cleanText.includes("important") || cleanText.includes("high priority")) {
        extractedPriority = "high"
        taskName = taskName.replace(/(urgent|important|high priority)/g, "").trim()
      } else if (cleanText.includes("low priority") || cleanText.includes("later")) {
        extractedPriority = "low"
        taskName = taskName.replace(/(low priority|later)/g, "").trim()
      }

      // Clean up task name
      taskName = taskName.replace(/^(schedule|add|create|make|do|task)\s*/i, "").trim()
      taskName = taskName.charAt(0).toUpperCase() + taskName.slice(1)

      // Default time if none found (spread throughout the day)
      if (!extractedTime) {
        const baseHour = 9 + index * 2 // Start at 9am, space 2 hours apart
        extractedTime = `${Math.min(baseHour, 17).toString().padStart(2, "0")}:00`
      }

      if (taskName && taskName.length > 2) {
        tasks.push({
          text: taskName,
          time: extractedTime,
          date: selectedDate,
          completed: false,
          priority: extractedPriority,
        })
      }
    })

    return tasks
  }, [selectedDate])

  const extractTasksWithGPT = useCallback(async (transcript: string): Promise<string> => {
    try {
      console.log("🤖 Sending transcript to GPT for task extraction...")
      
      const systemPrompt = `You are a multilingual task extraction assistant. Your job is to convert spoken text in ANY LANGUAGE into actionable task items with times and priorities.

IMPORTANT: You must format your response as a single sentence that follows this exact pattern:
"Schedule [task] at [time] [priority], then add [task] at [time] [priority], and create [task] at [time] [priority]"

Rules:
1. Extract 2-4 tasks from the transcript (regardless of language)
2. Each task should have a time (use 12-hour format like "9am", "2:30pm", "4pm")
3. Each task should have a priority: "high priority", "important", "urgent", "low priority", or "medium priority"
4. Use action words like: schedule, add, create, make, plan, organize, prepare, review, call, meet, attend
5. If no time is mentioned, assign reasonable times throughout the day (9am, 11am, 2pm, 4pm)
6. If no priority is mentioned, use "medium priority"
7. Combine all tasks into ONE sentence using "then" and "and" connectors
8. Make the response natural and conversational
9. ALWAYS respond in English, even if the input is in another language
10. If the transcript contains ANY mention of tasks, meetings, appointments, or activities, extract them

Examples of good responses:
- "Schedule team meeting at 9am high priority, then add doctor appointment at 2pm, and create project review at 4pm urgent"
- "Make lunch reservation at 12:30pm low priority, schedule client call at 3pm important, and add gym session at 6pm"
- "Create morning standup at 9:30am, then project planning at 11am high priority, and team retrospective at 4pm"

Hebrew examples:
- Input: "אני צריך פגישת צוות בבוקר, ואז יש לי תור לרופא בצהריים"
- Output: "Schedule team meeting at 9am high priority, then add doctor appointment at 2pm"

Input transcript: "${transcript}"

Respond with only the formatted task sentence in English:`

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript }
        ],
        max_tokens: 200,
        temperature: 0.3
      })

      const extractedTasks = response.choices[0]?.message?.content?.trim()
      console.log("🤖 GPT response:", extractedTasks)
      
      if (!extractedTasks) {
        throw new Error("No response from GPT")
      }

      // Check if GPT said there are no tasks
      if (extractedTasks.toLowerCase().includes("no tasks") || 
          extractedTasks.toLowerCase().includes("does not contain") ||
          extractedTasks.toLowerCase().includes("no actionable")) {
        console.log("⚠️ GPT detected no tasks, trying with more aggressive prompt...")
        
        // Try again with a more aggressive prompt
        const aggressivePrompt = `Extract ANY potential tasks, meetings, or activities from this text, even if they're not explicitly stated as tasks. Convert them into actionable items with times.

Text: "${transcript}"

Format as: "Schedule [task] at [time] [priority], then add [task] at [time] [priority]"

If you see ANY mention of meetings, appointments, calls, reviews, or activities, extract them as tasks.`

        const aggressiveResponse = await client.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: aggressivePrompt },
            { role: "user", content: transcript }
          ],
          max_tokens: 200,
          temperature: 0.5
        })

        const aggressiveResult = aggressiveResponse.choices[0]?.message?.content?.trim()
        console.log("🤖 Aggressive GPT response:", aggressiveResult)
        
        if (aggressiveResult && !aggressiveResult.toLowerCase().includes("no tasks")) {
          return aggressiveResult
        }
      }

      return extractedTasks
    } catch (error) {
      console.error("❌ Error extracting tasks with GPT:", error)
      // Fallback to original transcript if GPT fails
      return transcript
    }
  }, [])

  const processAudioFile = useCallback(async (file: File) => {
    setIsProcessingAudio(true)
    setTranscriptionResult("")

    try {
      console.log("🚀 Starting audio processing...")
      console.log("📁 File details:", {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        extension: file.name.split('.').pop()?.toLowerCase()
      })
      
      // Check if OpenAI client is available
      console.log("🔧 OpenAI client:", client)
      console.log("🔑 API Key available:", !!import.meta.env.VITE_OPENAI_API_KEY)
      
      // Handle M4A files specifically
      let audioFile = file
      let fileType = file.type
      
      // If it's an M4A file, ensure proper MIME type
      if (file.name.toLowerCase().endsWith('.m4a') || file.type === 'audio/mp4') {
        console.log("🎵 Detected M4A file, ensuring proper MIME type...")
        fileType = 'audio/mp4' // OpenAI expects audio/mp4 for M4A files
        audioFile = new File([file], file.name, { type: fileType })
        console.log("📄 Updated M4A file with proper MIME type:", audioFile)
      }
      
      console.log("📡 Sending request to OpenAI...")
      console.log("📄 Final file details:", {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size
      })
      
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "json",
      })

      console.log("✅ Transcription received:", transcription)
      console.log("📝 Transcription text:", transcription.text)
      setTranscriptionResult(transcription.text)

      // Use GPT to extract tasks from transcription
      console.log("🤖 Using GPT to extract tasks...")
      const extractedTasks = await extractTasksWithGPT(transcription.text)
      console.log("📋 GPT extracted tasks:", extractedTasks)
      
      // Parse the GPT-generated task string
      console.log("🔍 Parsing GPT tasks...")
      const newTasks = parseMultipleTasks(extractedTasks)
      console.log("📋 Final parsed tasks:", newTasks)
      
      if (newTasks.length > 0) {
        console.log("➕ Adding tasks to schedule...")
        addMultipleTasks(newTasks)
        console.log(`✅ Added ${newTasks.length} tasks from transcription`)
      } else {
        console.warn("⚠️ No tasks found in transcription")
      }

    } catch (error) {
      console.error("❌ Error processing audio:", error)
      console.error("❌ Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      
      // Provide more specific error messages
      let errorMessage = "Unknown error occurred"
      if (error instanceof Error) {
        if (error.message.includes("unsupported")) {
          errorMessage = `File format not supported. Please try MP3, WAV, M4A, or other common audio formats. Error: ${error.message}`
        } else if (error.message.includes("size")) {
          errorMessage = `File too large. Maximum size is 25MB. Error: ${error.message}`
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = `Network error. Please check your internet connection. Error: ${error.message}`
        } else {
          errorMessage = `Error processing audio: ${error.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      console.log("🏁 Finishing audio processing...")
      setIsProcessingAudio(false)
      setUploadedAudio(null)
      setTranscriptionResult("")
    }
  }, [addMultipleTasks, parseMultipleTasks, extractTasksWithGPT])

  const removeAudioFile = useCallback(() => {
    if (uploadedAudio) {
      URL.revokeObjectURL(uploadedAudio.url)
      setUploadedAudio(null)
      setTranscriptionResult("")
    }
  }, [uploadedAudio])

  const handleAddTask = useCallback(() => {
    if (newTask.trim() && newTime) {
      addTask({
        text: newTask.trim(),
        time: newTime,
        date: selectedDate,
        completed: false,
        priority: newPriority,
      })
      setNewTask("")
      setNewTime("")
      // Clear audio file after adding task
      if (uploadedAudio) {
        removeAudioFile()
      }
    }
  }, [newTask, newTime, selectedDate, newPriority, uploadedAudio, removeAudioFile, addTask])

  const navigateDate = useCallback((direction: "prev" | "next") => {
    const currentDate = new Date(selectedDate)
    const newDate = new Date(currentDate)
    const daysToMove = viewMode === "week" ? 7 : 1
    newDate.setDate(currentDate.getDate() + (direction === "next" ? daysToMove : -daysToMove))
    setSelectedDate(newDate.toISOString().split("T")[0])
  }, [selectedDate, viewMode])

  const getWeekDays = useCallback((startDate: string) => {
    const start = new Date(startDate)
    const startOfWeek = new Date(start)
    startOfWeek.setDate(start.getDate() - start.getDay()) // Start from Sunday

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      return day.toISOString().split("T")[0]
    })
  }, [])

  // Memoized computed values
  const todaysTasks = useMemo(() => 
    getTasksByDate(selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [getTasksByDate, selectedDate]
  )
  
  const completedCount = useMemo(() => 
    todaysTasks.filter((task) => task.completed).length,
    [todaysTasks]
  )

  const timeSlots = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0")
      return `${hour}:00`
    }),
    []
  )

  const weekDays = useMemo(() => getWeekDays(selectedDate), [getWeekDays, selectedDate])

  // Show loading state
  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 to-sky-200 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-sky-200 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-6 pb-2">
          <div className="w-16 h-16 bg-sky-400 rounded-full mx-auto mb-3 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">ONIT Scheduler</h1>
          <p className="text-sm text-gray-600">Plan your day efficiently</p>
        </div>

        {/* View Mode Tabs */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-3">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "day" | "week")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-sky-50">
                <TabsTrigger value="day" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Calendar className="w-4 h-4 mr-1" />
                  Day
                </TabsTrigger>
                <TabsTrigger value="week" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <CalendarDays className="w-4 h-4 mr-1" />
                  Week
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Date Navigation */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="text-blue-600 hover:bg-blue-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                {viewMode === "day" ? (
                  <>
                    <div className="text-lg font-semibold text-gray-900">{formatDate(selectedDate)}</div>
                    <div className="text-sm text-gray-500">{new Date(selectedDate).toLocaleDateString()}</div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-semibold text-gray-900">Week View</div>
                    <div className="text-sm text-gray-500">
                      {formatDate(weekDays[0], "short")} - {formatDate(weekDays[6], "short")}
                    </div>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateDate("next")}
                className="text-blue-600 hover:bg-blue-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {viewMode === "day" && (
              <div className="mt-3 flex justify-center gap-4 text-sm">
                <span className="text-blue-600 font-medium">{completedCount} completed</span>
                <span className="text-gray-600">{todaysTasks.length} total</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week View Days */}
        {viewMode === "week" && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-3">
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const dayTasks = getTasksByDate(day)
                  const isSelected = day === selectedDate
                  const isToday = day === new Date().toISOString().split("T")[0]

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(day)}
                      className={`p-2 rounded-lg text-center transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : isToday
                            ? "bg-sky-100 text-blue-600 font-medium"
                            : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="text-xs font-medium">{formatDate(day, "day")}</div>
                      <div className="text-sm">{new Date(day).getDate()}</div>
                      {dayTasks.length > 0 && (
                        <div
                          className={`w-1 h-1 rounded-full mx-auto mt-1 ${isSelected ? "bg-white" : "bg-blue-600"}`}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Task */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Schedule New Task
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {isProcessingAudio ? (
              // Progress State - Complete Card Replacement
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Audio</h3>
                <p className="text-sm text-gray-600 mb-4">Analyzing your recording and extracting tasks...</p>

                {transcriptionResult && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Transcription Complete</span>
                    </div>
                    <p className="text-sm text-green-700 text-left">"{transcriptionResult}"</p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding tasks to your schedule...
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            ) : (
              // Normal State - Original Form
              <>
                {/* Audio File Upload Section */}
                <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileAudio className="w-4 h-4" />
                      Audio Recording
                    </span>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 mb-2"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Audio File
                    </Button>
                    <p className="text-xs text-gray-500">Supports MP3, WAV, M4A, and other audio formats</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.wma,.aiff,.webm"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Live Voice Recording Section */}
                {speechSupported && (
                  <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        Live Recording
                      </span>
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`${
                          isRecording
                            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                            : "border-blue-200 text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="w-4 h-4 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-1" />
                            Record
                          </>
                        )}
                      </Button>
                    </div>

                    {isRecording && (
                      <div className="text-xs text-gray-600 mb-2">
                        🎤 Listening... Try saying multiple tasks: "Schedule team meeting at 9am, then add lunch at
                        12pm"
                      </div>
                    )}

                    {recordingText && (
                      <div className="bg-white rounded p-2 text-sm text-gray-700 border">
                        <span className="text-xs text-gray-500 block mb-1">Recognized:</span>"{recordingText}"
                      </div>
                    )}
                  </div>
                )}

                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="What do you need to do?"
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <Select value={newTime} onValueChange={setNewTime}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newPriority}
                    onValueChange={(value: "high" | "medium" | "low") => setNewPriority(value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddTask}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!newTask.trim() || !newTime}
                >
                  Schedule Task for {viewMode === "day" ? formatDate(selectedDate) : formatDate(selectedDate, "short")}
                </Button>

                <div className="text-xs text-gray-500 text-center">
                  💡 Tip: Upload audio files with multiple tasks - they'll be automatically added to your schedule
                </div>
                
                {/* Debug Section */}
                {/* <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      🐛 Debug
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={async () => {
                        console.log("🔧 Testing OpenAI client...")
                        console.log("Client:", client)
                        console.log("API Key:", import.meta.env.VITE_OPENAI_API_KEY ? "Present" : "Missing")
                        
                        try {
                          // Test with a simple text completion
                          const response = await client.chat.completions.create({
                            model: "gpt-3.5-turbo",
                            messages: [{ role: "user", content: "Say 'Hello from OpenAI!'" }],
                            max_tokens: 10
                          })
                          console.log("✅ OpenAI test successful:", response.choices[0]?.message?.content)
                          alert(`OpenAI test successful: ${response.choices[0]?.message?.content}`)
                        } catch (error) {
                          console.error("❌ OpenAI test failed:", error)
                          alert(`OpenAI test failed: ${error instanceof Error ? error.message : String(error)}`)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    >
                      Test OpenAI Connection
                    </Button>
                    <Button
                      onClick={() => {
                        const testText = "Schedule team meeting at 9am high priority, then add doctor appointment at 2pm"
                        console.log("🧪 Testing task parsing with:", testText)
                        const tasks = parseMultipleTasks(testText)
                        console.log("📋 Parsed tasks:", tasks)
                        alert(`Parsed ${tasks.length} tasks from test text`)
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    >
                      Test Task Parsing
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          console.log("🔧 Testing basic HTTP connection...")
                          const result = await invoke('test_http_connection')
                          console.log("✅ Basic HTTP test result:", result)
                          alert(`Basic HTTP test: ${result}`)
                        } catch (error) {
                          console.error("❌ Basic HTTP test failed:", error)
                          alert(`Basic HTTP test failed: ${error}`)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    >
                      Test Basic HTTP
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          console.log("🔧 Testing Tauri OpenAI connection...")
                          const result = await invoke('test_openai_connection')
                          console.log("✅ Tauri OpenAI test result:", result)
                          alert(`Tauri OpenAI test: ${result}`)
                        } catch (error) {
                          console.error("❌ Tauri OpenAI test failed:", error)
                          alert(`Tauri OpenAI test failed: ${error}`)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    >
                      Test Tauri OpenAI
                    </Button>
                    <Button
                      onClick={() => {
                        const testFile = new File(['test audio content'], 'test.m4a', { type: 'audio/mp4' })
                        console.log("🧪 Testing M4A file creation:", {
                          name: testFile.name,
                          type: testFile.type,
                          size: testFile.size
                        })
                        alert(`Test M4A file created: ${testFile.name}, type: ${testFile.type}, size: ${testFile.size} bytes`)
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    >
                      Test M4A File Creation
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          const testTranscript = "אני צריך פגישת צוות בבוקר, ואז יש לי תור לרופא בצהריים, ואני צריך לבדוק את הפרויקט לפני סוף היום"
                          console.log("🧪 Testing GPT task extraction with Hebrew:", testTranscript)
                          const result = await extractTasksWithGPT(testTranscript)
                          console.log("🤖 GPT task extraction result:", result)
                          alert(`GPT Task Extraction (Hebrew): ${result}`)
                        } catch (error) {
                          console.error("❌ GPT task extraction test failed:", error)
                          alert(`GPT task extraction failed: ${error}`)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    >
                      Test GPT Task Extraction
                    </Button>
                  </div>
                </div> */}
              </>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {viewMode === "day" ? formatDate(selectedDate) : formatDate(selectedDate, "short")} Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {todaysTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No tasks scheduled for this day</p>
                <p className="text-xs text-gray-400 mt-1">Add a task above to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      task.completed
                        ? "bg-green-50 border-green-200 opacity-75"
                        : "bg-white border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col items-center mt-1">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          task.completed ? "bg-green-600 border-green-600" : "border-gray-300 hover:border-blue-500"
                        }`}
                      >
                        {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-blue-600">{task.time}</span>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className={`text-sm ${task.completed ? "text-green-700 line-through" : "text-gray-900"}`}>
                        {task.text}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTask(task.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-7 w-7 mt-1"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 pb-6">
          <p>Stay organized with ONIT Scheduler</p>
        </div>
      </div>
    </div>
  )
}
