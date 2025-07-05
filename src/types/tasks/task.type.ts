export interface ScheduledTask {
    id: number
    text: string
    time: string
    date: string
    completed: boolean
    priority: "high" | "medium" | "low"
  }