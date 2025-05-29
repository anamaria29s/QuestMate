import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';
import { useNotifications } from './NotificationContext';
import { 
  fetchTasks, 
  checkNewAchievements
} from '../ApiService';
import './Notification.css';
import './AvailabilityChecker.css';
import TaskProgressBar from './ProgressBar';
import AvailabilityChecker from './AvailabilityChecker';

// Define themes just like in SharedCalendarPage
const themes = {
  default: {
    name: 'Default',
    primary: '#8a2be2',         // Vibrant purple
    secondary: '#f0e6fa',       // Light purple background
    accent: '#a64dff',          // Lighter purple for accent
    text: '#333333',
    calendarBackground: '#ffffff',
    taskBackground: '#f8f5ff',  // Very light purple background
    completedTask: '#e8e0f7'    // Light purple for completed tasks
  },
  dark: {
    name: 'Dark Mode',
    primary: '#2c3e50',
    secondary: '#34495e',
    accent: '#1abc9c',
    text: '#ffffff',          // Brighter white text for better contrast
    calendarBackground: '#2c3e50',
    taskBackground: '#34495e',
    completedTask: '#2c3e50'
  },
  pastel: {
    name: 'Pastel',
    primary: '#ffb6c1',
    secondary: '#f0e6fa',
    accent: '#87ceeb',
    text: '#5d4037',
    calendarBackground: '#fff8e1',
    taskBackground: '#f5f5f5',
    completedTask: '#e0f7fa'
  },
  vibrant: {
    name: 'Vibrant',
    primary: '#ff5722',         // Dark orange
    secondary: '#fff3e0',       // Light orange background
    accent: '#ff8a65',          // Lighter orange for accent elements
    text: '#212121',
    calendarBackground: '#ffffff',
    taskBackground: '#fff8e6',   // Very light orange background
    completedTask: '#ffecb3'     // Light orange for completed tasks
  },
  professional: {
    name: 'Professional',
    primary: '#1a237e',         // Dark blue
    secondary: '#e8eaf6',       // Light blue-gray background
    accent: '#3949ab',          // Medium blue for accent elements
    text: '#212121',            // Dark text for better readability
    calendarBackground: '#ffffff', // White background for calendar
    taskBackground: '#e8eaf6',   // Light blue-gray for tasks
    completedTask: '#d1d9ff'     // Light blue for completed tasks
  }
};

const CalendarPage = () => {
    const [tasks, setTasks] = useState([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingTask, setEditingTask] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isAdding, setIsAdding] = useState(false);
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const { addNotification } = useNotifications();
    // State for task timing
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    // State to track task progress for dates
    const [dateTasksMap, setDateTasksMap] = useState({});
    
    // New theme-related state
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [currentTheme, setCurrentTheme] = useState('default');

    // Load saved theme from localStorage on component mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('personal_calendar_theme');
        if (savedTheme && themes[savedTheme]) {
            setCurrentTheme(savedTheme);
        }
    }, []);

    const loadTasks = async (date) => {
        try {
            const data = await fetchTasks(date);
            setTasks(data);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    useEffect(() => {
        loadTasks(selectedDate);
    }, [selectedDate]);

    // Effect to load tasks for the whole month for progress tracking
    useEffect(() => {
        const fetchMonthTasks = async () => {
            try {
                // First day of current month view
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                // Last day of current month view
                const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                const response = await axios.get('http://127.0.0.1:8000/api/tasks/', {
                    params: {
                        start_date: firstDay.toISOString().split('T')[0],
                        end_date: lastDay.toISOString().split('T')[0]
                    },
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
                
                // Organize tasks by date
                const tasksByDate = {};
                response.data.forEach(task => {
                    const dateKey = task.date;
                    if (!tasksByDate[dateKey]) {
                        tasksByDate[dateKey] = [];
                    }
                    tasksByDate[dateKey].push(task);
                });
                
                setDateTasksMap(tasksByDate);
            } catch (error) {
                console.error("Error fetching month tasks:", error);
            }
        };
        
        fetchMonthTasks();
    }, [currentMonth]);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        setIsAdding(false);
        setEditingTask(null);
        resetTaskForm();
    };

    const changeMonth = (increment) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + increment);
        setCurrentMonth(newMonth);
    };

    const resetTaskForm = () => {
        setTaskTitle('');
        setTaskDescription('');
        setIsAllDay(true);
        setStartTime('09:00');
        setEndTime('10:00');
    };

    const handleTaskSubmit = async () => {
        if (!taskTitle.trim()) return;
        
        try {
            const taskData = {
                date: selectedDate.toISOString().split('T')[0],
                title: taskTitle,
                description: taskDescription,
                is_all_day: isAllDay,
            };

            if (!isAllDay) {
                taskData.start_time = startTime;
                taskData.end_time = endTime;
            }

            if (editingTask) {
                await axios.put(`http://127.0.0.1:8000/api/tasks/${editingTask.id}/edit/`, taskData, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
            } else {
                await axios.post('http://127.0.0.1:8000/api/tasks/add/', taskData, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
            }
            
            resetTaskForm();
            setEditingTask(null);
            setIsAdding(false);
            loadTasks(selectedDate);
            
            // Refresh the month view data
            const dateKey = selectedDate.toISOString().split('T')[0];
            const currentDateTasks = dateTasksMap[dateKey] || [];
            
            if (editingTask) {
                const updatedTasks = currentDateTasks.map(t => 
                    t.id === editingTask.id ? { ...taskData, id: editingTask.id } : t
                );
                setDateTasksMap({
                    ...dateTasksMap,
                    [dateKey]: updatedTasks
                });
            } else {
                // For simplicity's sake, reload the entire month tasks
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                const response = await axios.get('http://127.0.0.1:8000/api/tasks/', {
                    params: {
                        start_date: firstDay.toISOString().split('T')[0],
                        end_date: lastDay.toISOString().split('T')[0]
                    },
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
                
                const tasksByDate = {};
                response.data.forEach(task => {
                    const dateKey = task.date;
                    if (!tasksByDate[dateKey]) {
                        tasksByDate[dateKey] = [];
                    }
                    tasksByDate[dateKey].push(task);
                });
                
                setDateTasksMap(tasksByDate);
            }
        } catch (error) {
            console.error("Error saving task:", error);
        }
    };

    const handleEdit = (task) => {
        setEditingTask(task);
        setTaskTitle(task.title);
        setTaskDescription(task.description);
        
        setIsAllDay(task.is_all_day);
        if (!task.is_all_day && task.start_time && task.end_time) {
            setStartTime(task.start_time.substring(0, 5)); // Format HH:MM
            setEndTime(task.end_time.substring(0, 5)); 
        } else {
            setStartTime('09:00');
            setEndTime('10:00');
        }
        
        setIsAdding(true);
    };

    const handleDelete = async (taskId) => {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/tasks/${taskId}/delete/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            loadTasks(selectedDate);
            
            // Update the month view data
            const dateKey = selectedDate.toISOString().split('T')[0];
            const currentDateTasks = dateTasksMap[dateKey] || [];
            const updatedTasks = currentDateTasks.filter(t => t.id !== taskId);
            
            setDateTasksMap({
                ...dateTasksMap,
                [dateKey]: updatedTasks
            });
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const handleToggleTaskCompletion = async (task) => {
        try {
            await axios.put(`http://127.0.0.1:8000/api/tasks/${task.id}/toggle/`, {
                ...task,
                completed: !task.completed,
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            
            loadTasks(selectedDate);
            
            // Update the month view data
            const dateKey = selectedDate.toISOString().split('T')[0];
            const currentDateTasks = dateTasksMap[dateKey] || [];
            const updatedTasks = currentDateTasks.map(t => 
                t.id === task.id ? { ...t, completed: !task.completed } : t
            );
            
            setDateTasksMap({
                ...dateTasksMap,
                [dateKey]: updatedTasks
            });
            
            if (!task.completed) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const newAchievements = await checkNewAchievements();
                
                if (newAchievements && newAchievements.length > 0) {
                    const firstNewAchievement = newAchievements[0].achievement;
                    localStorage.setItem('new_achievement', JSON.stringify(firstNewAchievement));
                    
                    newAchievements.forEach(achievementData => {
                        const achievement = achievementData.achievement;
                        addNotification({
                            type: 'achievement',
                            title: 'Achievement Unlocked!',
                            message: `${achievement.name}: ${achievement.description}`
                        });
                    });
                }
            }
        } catch (error) {
            console.error("Error toggling task:", error);
        }
    };
    
    const cancelEditing = () => {
        setEditingTask(null);
        resetTaskForm();
        setIsAdding(false);
    };

    const tileClassName = ({ date }) => {
        const formattedDate = date.toISOString().split('T')[0];
        const tasksForDate = dateTasksMap[formattedDate] || [];
        
        if (tasksForDate.length === 0) return null;
        
        // Check if the date has tasks with specific statuses
        const hasOverdueTasks = tasksForDate.some(task => 
            !task.completed && new Date(task.date) < new Date().setHours(0,0,0,0)
        );
        
        const hasDueTodayTasks = tasksForDate.some(task => 
            !task.completed && 
            new Date(task.date).toDateString() === new Date().toDateString()
        );
        
        // Return appropriate class
        if (hasOverdueTasks) return 'has-overdue-tasks';
        if (hasDueTodayTasks) return 'has-due-today-tasks';
        return 'has-tasks';
    };

    const formatSelectedDate = () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return selectedDate.toLocaleDateString(undefined, options);
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        
        if (timeString.length === 5) return timeString;
        
        return timeString.substring(0, 5); 
    };

    // New function to handle adding a task from availability checker
    const handleAddTaskFromAvailability = (date, startTime, endTime) => {
        setSelectedDate(date);
        setIsAllDay(false);
        setStartTime(startTime);
        setEndTime(endTime);
        setIsAdding(true);
        setIsCheckingAvailability(false);
    };

    // New theme functions
    const toggleThemeSelector = () => {
        setShowThemeSelector(!showThemeSelector);
    };

    const changeTheme = (themeName) => {
        if (themes[themeName]) {
            setCurrentTheme(themeName);
            localStorage.setItem('personal_calendar_theme', themeName);
            setShowThemeSelector(false);
            
            addNotification({
                type: 'success',
                title: 'Theme Changed',
                message: `Calendar theme changed to ${themes[themeName].name}`
            });
        }
    };

    // Apply theme styles
    const themeStyle = {
        '--primary-color': themes[currentTheme].primary,
        '--secondary-color': themes[currentTheme].secondary,
        '--accent-color': themes[currentTheme].accent,
        '--text-color': themes[currentTheme].text,
        '--calendar-bg': themes[currentTheme].calendarBackground,
        '--task-bg': themes[currentTheme].taskBackground,
        '--completed-task-bg': themes[currentTheme].completedTask,
        '--primary-transparent': `${themes[currentTheme].primary}1a` 
    };

    return (
        <div className="calendar-page" style={themeStyle}>
            <div className="calendar-sidebar">
                <div className="calendar-header">
                    <h2>Tasks Calendar</h2>
                    <button 
                        onClick={toggleThemeSelector}
                        className="theme-button"
                        title="Change Theme"
                    >
                        <span role="img" aria-label="Theme">🎨</span>
                    </button>
                </div>
                
                {showThemeSelector && (
                    <div className="theme-selector">
                        <h4>Select Theme</h4>
                        <div className="theme-options">
                            {Object.keys(themes).map(themeName => {
                                // Get theme-specific classes
                                const themeClassName = themeName.toLowerCase().replace(' ', '-');
                                
                                return (
                                    <button
                                        key={themeName}
                                        className={`theme-option ${themeClassName} ${currentTheme === themeName ? 'active' : ''}`}
                                        onClick={() => changeTheme(themeName)}
                                        style={{
                                            backgroundColor: themes[themeName].primary,
                                        }}
                                    >
                                        {themes[themeName].name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                <div className="calendar-nav">
                    <button onClick={() => changeMonth(-1)} className="month-nav-btn">
                        <span>←</span>
                    </button>
                    <span className="current-month">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => changeMonth(1)} className="month-nav-btn">
                        <span>→</span>
                    </button>
                </div>

                <Calendar 
                    onChange={handleDateChange} 
                    value={selectedDate} 
                    activeStartDate={currentMonth}
                    onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
                    tileClassName={tileClassName}
                    className={`calendar-${currentTheme}`}
                />
                
                <div className="add-task-button-container">
                    <button 
                        onClick={() => setIsAdding(!isAdding)} 
                        className={`add-task-button ${isAdding ? 'active' : ''}`}
                    >
                        {isAdding ? 'Cancel' : '+ Add New Task'}
                    </button>
                    <button 
                        onClick={() => setIsCheckingAvailability(true)} 
                        className="check-availability-button"
                    >
                        Check Availability
                    </button>
                </div>
            </div>

            <div className="tasks-main">
                <div className="selected-date-header">
                    <h3>{formatSelectedDate()}</h3>
                    <div className="task-count">
                        {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                    </div>
                </div>
                
                {/* Task Progress Bar */}
                {tasks.length > 0 && (
                    <TaskProgressBar tasks={tasks} />
                )}

                {isAdding && (
                    <div className="task-form">
                        <h4>{editingTask ? 'Edit Task' : 'Add New Task'}</h4>
                        <input
                            type="text"
                            placeholder="Task Title"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                        />
                        <textarea
                            placeholder="Task Description"
                            value={taskDescription}
                            onChange={(e) => setTaskDescription(e.target.value)}
                        />
                        
                        {/* Task timing options */}
                        <div className="task-timing">
                            <div className="timing-option">
                                <label className="checkbox-container">
                                    <input 
                                        type="checkbox" 
                                        checked={isAllDay}
                                        onChange={() => setIsAllDay(!isAllDay)} 
                                    />
                                    All day
                                </label>
                            </div>
                            
                            {!isAllDay && (
                                <div className="time-selection">
                                    <div className="time-input">
                                        <label>Start:</label>
                                        <input 
                                            type="time" 
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="time-input">
                                        <label>End:</label>
                                        <input 
                                            type="time" 
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        
                        <div className="form-buttons">
                            <button onClick={cancelEditing} className="cancel-btn">Cancel</button>
                            <button 
                                onClick={handleTaskSubmit} 
                                className="submit-btn"
                                disabled={!taskTitle.trim() || (!isAllDay && (!startTime || !endTime))}
                            >
                                {editingTask ? 'Update Task' : 'Add Task'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="tasks-list">
                    {tasks.length === 0 ? (
                        <div className="no-tasks">
                            <p>No tasks for this date.</p>
                            {!isAdding && (
                                <button onClick={() => setIsAdding(true)} className="start-adding-btn">
                                    Add Your First Task
                                </button>
                            )}
                        </div>
                    ) : (
                        <ul>
                            {tasks.map(task => (
                                <li key={task.id} className={task.completed ? 'completed' : ''}>
                                    <div className="task-header">
                                        <label className="task-checkbox">
                                            <input 
                                                type="checkbox" 
                                                checked={task.completed} 
                                                onChange={() => handleToggleTaskCompletion(task)} 
                                            />
                                            <span className="checkmark"></span>
                                        </label>
                                        <div className="task-title-container">
                                            <h4>{task.title}</h4>
                                            {!task.is_all_day && task.start_time && task.end_time && (
                                                <div className="task-time">
                                                    {formatTime(task.start_time)} - {formatTime(task.end_time)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {task.description && (
                                        <p className="task-description">{task.description}</p>
                                    )}
                                    
                                    <div className="task-actions">
                                        <button onClick={() => handleEdit(task)} className="edit-btn">Edit</button>
                                        <button onClick={() => handleDelete(task.id)} className="delete-btn">Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            
            {/* Availability Checker Modal */}
            {isCheckingAvailability && (
                <AvailabilityChecker 
                    onClose={() => setIsCheckingAvailability(false)} 
                    onAddTask={handleAddTaskFromAvailability}
                    selectedDate={selectedDate}
                />
            )}
        </div>
    );
};

export default CalendarPage;