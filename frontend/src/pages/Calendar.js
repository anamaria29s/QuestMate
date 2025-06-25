import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';
import { useNotifications } from './NotificationContext';
import { 
  checkNewAchievements
} from '../ApiService';
import './Notification.css';
import './AvailabilityChecker.css';
import TaskProgressBar from './ProgressBar';
import AvailabilityChecker from './AvailabilityChecker';
import TaskCategory from './TaskCategory';

const themes = {
  default: {
    name: 'Default',
    primary: '#8a2be2',         // Vibrant purple
    secondary: '#f0e6fa',       // Light purple background
    accent: '#a64dff',          // Lighter purple for accent
    text: '#333333',
    secondtext: '#333333',
    calendarBackground: '#ffffff',
    taskBackground: '#f8f5ff',  // Very light purple background
    completedTask: '#e8e0f7'    
  },
  dark: {
    name: 'Dark Mode',
    primary: '#10b981',        // Green primary
    secondary: '#059669',      // Darker green secondary  
    accent: '#34d399',         // Light green accent
    text: '#ffffff',           // White text
    secondtext: '#d1d5db',     // Light gray secondary text
    calendarBackground: '#111827',  // Very dark background
    taskBackground: '#1f2937',      // Dark gray for task cards
    completedTask: '#065f46'  
  },
  pastel: {
    name: 'Pastel',
    primary: '#ffb6c1',
    secondary: '#f0e6fa',
    accent: '#87ceeb',
    text: '#5d4037',
    secondtext: '#5d4037',
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
    secondtext: '#212121',
    calendarBackground: '#ffffff',
    taskBackground: '#fff8e6',   // Very light orange background
    completedTask: '#ffecb3'     // Light orange for completed tasks
  },
  professional: {
    name: 'Professional',
    primary: '#1a237e',         // Dark blue
    secondary: '#e8eaf6',       // Light blue-gray background
    accent: '#3949ab',          // Medium blue for accent elements
    secondtext: '#212121',            // Dark text for better readability
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
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [dateTasksMap, setDateTasksMap] = useState({});
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [currentTheme, setCurrentTheme] = useState('default');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(null); 
    const [priorityFilter, setPriorityFilter] = useState(null); 
    const [prioritySort, setPrioritySort] = useState('high_first'); 
    const [dateSort, setDateSort] = useState('asc'); 
    const [taskPriority, setTaskPriority] = useState('medium'); 
    const [allDayTasks, setAllDayTasks] = useState([]);

    useEffect(() => {
        const savedTheme = localStorage.getItem('personal_calendar_theme');
        if (savedTheme && themes[savedTheme]) {
            setCurrentTheme(savedTheme);
        }
    }, []);

    const formatLocalDate = (date) => {
        // Ensure we're working with a Date object
        const localDate = new Date(date);
        
        // Get the local date components to avoid timezone issues
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    };
    

    const loadCategories = useCallback(async () => {
        try {
            const token = localStorage.getItem('access');
            if (!token) return;

            const response = await axios.get('http://127.0.0.1:8000/api/task-categories/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setCategories(response.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);        

    const getFilteredTasks = () => {
        let filtered = tasks;
        
        if (selectedDate) {
        const selectedDateString = formatLocalDate(selectedDate);
        filtered = filtered.filter(task => {
            return task.date === selectedDateString;
        });
    }
        
        // Filter by category
        if (categoryFilter !== null) {
            filtered = filtered.filter(task => String(task.category) === String(categoryFilter));
        }
        
        // Filter by priority
        if (priorityFilter !== null) {
            filtered = filtered.filter(task => task.priority === priorityFilter);
        }
        
        return filtered;
    };
    const getAllTasksForSelectedDate = () => {
        if (!selectedDate) return [];
        
        const selectedDateString = selectedDate.toISOString().split('T')[0];
        return tasks.filter(task => {
            const taskDateString = new Date(task.date).toISOString().split('T')[0];
            return taskDateString === selectedDateString;
        });
    };
    
    const loadTasks = useCallback(async (date) => {
        try {
            const formattedDate = formatLocalDate(date);
            console.log("Loading tasks for formatted date:", formattedDate);
            
            const token = localStorage.getItem('access');
            if (!token) {
                console.error("No access token found");
                return;
            }
            const allTasksResponse = await axios.get('http://127.0.0.1:8000/api/tasks/', {
                params: { date: formattedDate },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Store all tasks for the day (unfiltered) - this is for the progress bar
            setAllDayTasks(allTasksResponse.data);
            
            // Build URL with priority sorting parameters
            let url = 'http://127.0.0.1:8000/api/tasks/';
            const params = new URLSearchParams({ date: formattedDate });
            
            // If we want sorted tasks by priority, use the sorted endpoint
            if (prioritySort !== 'date_only') {
                url = 'http://127.0.0.1:8000/api/tasks/sorted/';
                params.append('priority_sort', prioritySort);
                params.append('date_sort', dateSort);
            }
            
            const response = await axios.get(`${url}?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Filter by priority if a specific priority is selected
            let filteredTasks = response.data;
            if (priorityFilter) {
                filteredTasks = response.data.filter(task => task.priority === priorityFilter);
            }
            
            setTasks(filteredTasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }, [priorityFilter, prioritySort, dateSort]);

    useEffect(() => {
        loadTasks(selectedDate);
    }, [selectedDate, loadTasks]);

    useEffect(() => {
    const fetchMonthTasks = async () => {
        try {
            const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            
            const response = await axios.get('http://127.0.0.1:8000/api/tasks/', {
                params: {
                    start_date: formatLocalDate(firstDay),
                    end_date: formatLocalDate(lastDay)
                },
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            
            // Organize tasks by date - use the backend date directly
            const tasksByDate = {};
            response.data.forEach(task => {
                const dateKey = task.date; // Use backend date as-is
                
                if (!tasksByDate[dateKey]) {
                    tasksByDate[dateKey] = [];
                }
                tasksByDate[dateKey].push(task);
            });
            
            // Debug logging
            console.log('Tasks by date:', tasksByDate);
            console.log('Current month:', currentMonth);
            
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
        setSelectedCategory('');
        setTaskPriority('medium');
    };

    const handleTaskSubmit = async () => {
        if (!taskTitle.trim()) return;
        
        try {
            const formattedDate = formatLocalDate(selectedDate);
            
            const taskData = {
                date: formattedDate,
                title: taskTitle,
                description: taskDescription,
                is_all_day: isAllDay,
                category: selectedCategory || null,
                priority: taskPriority,
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
            
            // Reload tasks (this will update both filtered tasks and allDayTasks)
            loadTasks(selectedDate);
            loadCategories(); // Refresh categories in case new ones were added
            
            // Update dateTasksMap for calendar view
            const dateKey = formatLocalDate(selectedDate);
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
                // Refresh the entire month view
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                const response = await axios.get('http://127.0.0.1:8000/api/tasks/', {
                    params: {
                        start_date: formatLocalDate(firstDay),
                        end_date: formatLocalDate(lastDay)
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
        setSelectedCategory(task.category || '');
        setTaskPriority(task.priority || 'medium');
        
        setIsAllDay(task.is_all_day);
        if (!task.is_all_day && task.start_time && task.end_time) {
            setStartTime(task.start_time.substring(0, 5)); 
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
            
            // Reload tasks (this will update both tasks and allDayTasks)
            loadTasks(selectedDate);
            
            // Update dateTasksMap
            const dateKey = formatLocalDate(selectedDate);
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
            
            // Reload tasks (this will update both tasks and allDayTasks)
            loadTasks(selectedDate);
            
            // Update dateTasksMap for calendar view
            const dateKey = formatLocalDate(selectedDate);
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
        const formattedDate = formatLocalDate(date);
        const tasksForDate = dateTasksMap[formattedDate] || [];
        
        if (tasksForDate.length === 0) return null;
        
        const hasOverdueTasks = tasksForDate.some(task => 
            !task.completed && new Date(task.date) < new Date().setHours(0,0,0,0)
        );
        
        const hasDueTodayTasks = tasksForDate.some(task => 
            !task.completed && 
            task.date === formatLocalDate(new Date()) 
        );
        
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

    
    
    const filteredTasks = getFilteredTasks();
    const allTasksForDate = getAllTasksForSelectedDate();
    

    const themeStyle = {
        '--primary-color': themes[currentTheme].primary,
        '--secondary-color': themes[currentTheme].secondary,
        '--accent-color': themes[currentTheme].accent,
        '--text-color': themes[currentTheme].text,
        '--secondtext-color': themes[currentTheme].secondtext,
        '--calendar-bg': themes[currentTheme].calendarBackground,
        '--task-bg': themes[currentTheme].taskBackground,
        '--completed-task-bg': themes[currentTheme].completedTask,
        '--primary-transparent': `${themes[currentTheme].primary}1a`,
        '--glass-bg-dynamic': currentTheme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.1)',
        '--glass-border-dynamic': currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
        '--sidebar-bg': currentTheme === 'dark' ? '#1f2937' : 'var(--glass-bg)'
    };
    return (
        <div className="calendar-page" style={themeStyle}>
            <div className="calendar-sidebar">
                <div className="calendar-header">
                    <h2>My Calendar</h2>
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
                <div>
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
                    {/* Availability Checker Modal */}
                    {isCheckingAvailability && (
                        <AvailabilityChecker 
                            onClose={() => setIsCheckingAvailability(false)} 
                            onAddTask={handleAddTaskFromAvailability}
                            selectedDate={selectedDate}
                        />
                    )}
                </div>
            </div>

            <div className="tasks-main">
                <div className="selected-date-header">
                    <h3>{formatSelectedDate()}</h3>
                    <div className="task-count">
                        {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                        {categoryFilter !== 'all' && categoryFilter !== null && (
                            <span className="filter-indicator">
                            (
                                {
                                categoryFilter === 'uncategorized'
                                    ? 'Uncategorized'
                                    : categories.find(cat => String(cat.id) === String(categoryFilter))?.name || 'Unknown'
                                }
                            )
                            </span>

                        )}
                    </div>
                </div>
                
                {/* Task Progress Bar */}
                {allDayTasks.length > 0 && (
                    <TaskProgressBar tasks={allDayTasks} />
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
                        
                        {/* Category Selection */}
                        <div className="category-selection">
                            <label htmlFor="task-category">Category:</label>
                            <select 
                                id="task-category"
                                value={selectedCategory} 
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="task-category-select"
                            >
                                <option value="">No Category</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Priority Selection */}
                        <div className="priority-selection">
                            <label htmlFor="task-priority">Priority:</label>
                            <select 
                                id="task-priority"
                                value={taskPriority} 
                                onChange={(e) => setTaskPriority(e.target.value)}
                                className="task-priority-select"
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                            </select>
                        </div>
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
                    {filteredTasks.length === 0 ? (
                        <div className="no-tasks">
                        <p>No tasks {categoryFilter ? 'in this category' : 'for this date'}.</p>
                        </div>
                    ) : (
                        <ul>
                        {filteredTasks.map(task => (
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
                                {!task.is_all_day && task.start_time && task.end_time && (
                                                <div className="task-time">
                                                    {formatTime(task.start_time)} - {formatTime(task.end_time)}
                                                </div>
                                            )}
                                <div className="task-title-container">
                                <h4>{task.title}</h4>
        
                                {/* Show priority for ALL tasks */}
                                {task.priority && (
                                    <div className={`task-priority priority-${task.priority} theme-based`}>
                                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
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

            <div className='calendar-filter'>
                {/* Use TaskCategory component instead of built-in category manager */}
                <TaskCategory 
                    onCategorySelect={setCategoryFilter}
                    selectedCategory={categoryFilter === 'all' ? null : categoryFilter}
                />

                {/* Priority Filter and Sort Controls */}
                    <div className="priority-controls">
                        <h4>Priority Filter</h4>
                        <div className="priority-filter-buttons">
                            <button 
                                className={priorityFilter === null ? 'active' : ''}
                                onClick={() => setPriorityFilter(null)}
                            >
                                All
                            </button>
                            <button 
                                className={priorityFilter === 'high' ? 'active priority-high' : 'priority-high'}
                                onClick={() => setPriorityFilter('high')}
                            >
                                High
                            </button>
                            <button 
                                className={priorityFilter === 'medium' ? 'active priority-medium' : 'priority-medium'}
                                onClick={() => setPriorityFilter('medium')}
                            >
                                Medium
                            </button>
                            <button 
                                className={priorityFilter === 'low' ? 'active priority-low' : 'priority-low'}
                                onClick={() => setPriorityFilter('low')}
                            >
                                Low
                            </button>
                        </div>
                        
                        <div className="sort-section">
                            <h4>Sort By</h4>
                            <div className="sort-controls">
                                <select 
                                    value={prioritySort} 
                                    onChange={(e) => setPrioritySort(e.target.value)}
                                    className="sort-select"
                                >
                                    <option value="high_first">High Priority First</option>
                                    <option value="low_first">Low Priority First</option>
                                    <option value="date_only">Date Only</option>
                                </select>
                                
                                <select 
                                    value={dateSort} 
                                    onChange={(e) => setDateSort(e.target.value)}
                                    className="sort-select"
                                >
                                    <option value="asc">Oldest First</option>
                                    <option value="desc">Newest First</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                   

            </div>
            
            
        </div>
    );
};

export default CalendarPage