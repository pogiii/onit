import { ScheduledTask } from "./task.type";

export interface TaskContextType {
  // State
  tasks: ScheduledTask[];
  isLoading: boolean;
  
  // Task CRUD operations
  addTask: (task: Omit<ScheduledTask, 'id'>) => void;
  updateTask: (id: number, updates: Partial<ScheduledTask>) => void;
  deleteTask: (id: number) => void;
  toggleTask: (id: number) => void;
  
  // Bulk operations
  addMultipleTasks: (tasks: Omit<ScheduledTask, 'id'>[]) => void;
  deleteTasksByDate: (date: string) => void;
  clearCompletedTasks: () => void;
  
  // Query methods
  getTasksByDate: (date: string) => ScheduledTask[];
  getTasksByDateRange: (startDate: string, endDate: string) => ScheduledTask[];
  getCompletedTasks: () => ScheduledTask[];
  getPendingTasks: () => ScheduledTask[];
  
  // Utility methods
  getTaskById: (id: number) => ScheduledTask | undefined;
  getNextTaskId: () => number;
}