import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './SharedCalendarPage.css'; 
import Leaderboard from './Leaderboard'; 
import { useNotifications } from './NotificationContext';
import { 
  fetchSharedTasks, 
  toggleSharedTaskCompletion, 
  checkNewAchievements 
} from '../ApiService';
import axios from 'axios';

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

const SharedCalendarPage = () => {
    const { id: calendarId } = useParams();
    const [tasks, setTasks] = useState([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingTask, setEditingTask] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isAdding, setIsAdding] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [currentTheme, setCurrentTheme] = useState('default');
    const { addNotification } = useNotifications();
    // New state for task timing
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');

    useEffect(() => {
        const savedTheme = localStorage.getItem(`calendar_theme_${calendarId}`);
        if (savedTheme && themes[savedTheme]) {
            setCurrentTheme(savedTheme);
        }
    }, [calendarId]);

    const loadTasks = useCallback(async (date) => {
        try {
            const data = await fetchSharedTasks(calendarId, date);
            setTasks(data);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }, [calendarId]);

    useEffect(() => {
        if (calendarId) {
            loadTasks(selectedDate);
        }
    }, [calendarId, selectedDate, loadTasks]);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        setIsAdding(false);
        setEditingTask(null);
        resetTaskForm();
    };

    const resetTaskForm = () => {
        setTaskTitle('');
        setTaskDescription('');
        setIsAllDay(true);
        setStartTime('09:00');
        setEndTime('10:00');
    };

    const changeMonth = (increment) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + increment);
        setCurrentMonth(newMonth);
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
                await axios.put(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/${editingTask.id}/edit/`, taskData, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
            } else {
                await axios.post(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/add/`, taskData, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
            }
            
            resetTaskForm();
            setEditingTask(null);
            setIsAdding(false);
            loadTasks(selectedDate);
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
            await axios.delete(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/${taskId}/delete/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            loadTasks(selectedDate);
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const toggleTaskCompletion = async (task) => {
        try {
            console.log('Toggle task completion started for task:', task);
            
            await toggleSharedTaskCompletion(calendarId, task.id, task);
            
            console.log('Task toggled successfully');
            loadTasks(selectedDate);
            
            if (!task.completed) {
                console.log('Task was marked as completed, checking for achievements...');
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const newAchievements = await checkNewAchievements();
                console.log('New achievements found:', newAchievements);
                
                if (newAchievements && newAchievements.length > 0) {
                    console.log('Found new achievements, showing notifications');
                    
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
        
        const hasTasksOnDate = tasks.some(task => 
            new Date(task.date).toISOString().split('T')[0] === formattedDate
        );
        
        return hasTasksOnDate ? 'has-tasks' : null;
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

    const toggleLeaderboard = () => {
        setShowLeaderboard(!showLeaderboard);
    };

    const toggleThemeSelector = () => {
        setShowThemeSelector(!showThemeSelector);
    };

    const changeTheme = (themeName) => {
        if (themes[themeName]) {
            setCurrentTheme(themeName);
            localStorage.setItem(`calendar_theme_${calendarId}`, themeName);
            setShowThemeSelector(false);
            
            addNotification({
                type: 'success',
                title: 'Theme Changed',
                message: `Calendar theme changed to ${themes[themeName].name}`
            });
        }
    };

    const themeStyle = {
        '--primary-color': themes[currentTheme].primary,
        '--secondary-color': themes[currentTheme].secondary,
        '--accent-color': themes[currentTheme].accent,
        '--text-color': themes[currentTheme].text,
        '--calendar-bg': themes[currentTheme].calendarBackground,
        '--task-bg': themes[currentTheme].taskBackground,
        '--completed-task-bg': themes[currentTheme].completedTask
    };

    return (
        <div className="calendar-page" style={themeStyle}>
            <div className="calendar-sidebar">
                <div className="calendar-header">
                    <h2>Shared Calendar</h2>
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
                                            // Text color is now controlled by CSS classes for better specificity
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
                        onClick={toggleLeaderboard} 
                        className={`add-task-button ${showLeaderboard ? 'active' : ''}`}
                    >
                        {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
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
                                    <span className="checkmark"></span>
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
                                                onChange={() => toggleTaskCompletion(task)} 
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

                {showLeaderboard && (
                    <div className="leaderboard-section">
                        <Leaderboard calendarId={calendarId} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SharedCalendarPage;