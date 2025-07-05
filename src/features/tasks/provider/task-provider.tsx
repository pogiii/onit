import { TaskContextType } from "@/types/tasks/task-context-type";
import { ScheduledTask } from "@/types/tasks/task.type";
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { store } from "@/lib/store-init";

const TaskContext = createContext<TaskContextType | null>(null);

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
};

export const TaskProvider = ({ children }: { children: React.ReactNode }) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks from persistent storage
  const loadTasks = useCallback(async () => {
    try {
      const storedTasks = await store.get<ScheduledTask[]>("tasks");
      if (storedTasks) {
        setTasks(storedTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save tasks to persistent storage
  const saveTasks = useCallback(async (newTasks: ScheduledTask[]) => {
    try {
      await store.set("tasks", newTasks);
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  }, []);

  // Initialize tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Generate next task ID
  const getNextTaskId = useCallback(() => {
    if (tasks.length === 0) return 1;
    return Math.max(...tasks.map(task => task.id)) + 1;
  }, [tasks]);

  // CRUD Operations
  const addTask = useCallback((taskData: Omit<ScheduledTask, 'id'>) => {
    const newTask: ScheduledTask = {
      ...taskData,
      id: getNextTaskId(),
    };
    
    setTasks(prevTasks => {
      const newTasks = [...prevTasks, newTask];
      saveTasks(newTasks);
      return newTasks;
    });
  }, [getNextTaskId, saveTasks]);

  const updateTask = useCallback((id: number, updates: Partial<ScheduledTask>) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.map(task => 
        task.id === id ? { ...task, ...updates } : task
      );
      saveTasks(newTasks);
      return newTasks;
    });
  }, [saveTasks]);

  const deleteTask = useCallback((id: number) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.filter(task => task.id !== id);
      saveTasks(newTasks);
      return newTasks;
    });
  }, [saveTasks]);

  const toggleTask = useCallback((id: number) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      );
      saveTasks(newTasks);
      return newTasks;
    });
  }, [saveTasks]);

  // Bulk Operations
  const addMultipleTasks = useCallback((tasksData: Omit<ScheduledTask, 'id'>[]) => {
    setTasks(prevTasks => {
      const newTasks = [
        ...prevTasks,
        ...tasksData.map((taskData, index) => ({
          ...taskData,
          id: getNextTaskId() + index,
        }))
      ];
      saveTasks(newTasks);
      return newTasks;
    });
  }, [getNextTaskId, saveTasks]);

  const deleteTasksByDate = useCallback((date: string) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.filter(task => task.date !== date);
      saveTasks(newTasks);
      return newTasks;
    });
  }, [saveTasks]);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.filter(task => !task.completed);
      saveTasks(newTasks);
      return newTasks;
    });
  }, [saveTasks]);

  // Query Methods
  const getTasksByDate = useCallback((date: string) => {
    return tasks.filter(task => task.date === date);
  }, [tasks]);

  const getTasksByDateRange = useCallback((startDate: string, endDate: string) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return taskDate >= start && taskDate <= end;
    });
  }, [tasks]);

  const getCompletedTasks = useCallback(() => {
    return tasks.filter(task => task.completed);
  }, [tasks]);

  const getPendingTasks = useCallback(() => {
    return tasks.filter(task => !task.completed);
  }, [tasks]);

  // Utility Methods
  const getTaskById = useCallback((id: number) => {
    return tasks.find(task => task.id === id);
  }, [tasks]);

  // Memoized context value
  const contextValue = useMemo<TaskContextType>(() => ({
    tasks,
    isLoading,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    addMultipleTasks,
    deleteTasksByDate,
    clearCompletedTasks,
    getTasksByDate,
    getTasksByDateRange,
    getCompletedTasks,
    getPendingTasks,
    getTaskById,
    getNextTaskId,
  }), [
    tasks,
    isLoading,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    addMultipleTasks,
    deleteTasksByDate,
    clearCompletedTasks,
    getTasksByDate,
    getTasksByDateRange,
    getCompletedTasks,
    getPendingTasks,
    getTaskById,
    getNextTaskId,
  ]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};