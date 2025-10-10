import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Calendar from 'react-calendar';
import './SharedCalendarPage.css'; 
import Leaderboard from './Leaderboard'; 
import SharedTaskCategory from './SharedTaskCategory'; 
import { useNotifications } from './NotificationContext';
import { 
  toggleSharedTaskCompletion, 
  checkNewAchievements 
} from '../ApiService';
import axios from 'axios';

const themes = {
  default: {
    name: 'Default',
    primary: '#8a2be2',        
    secondary: '#f0e6fa',       
    accent: '#a64dff',         
    text: '#333333',
    secondtext: '#333333',
    calendarBackground: '#ffffff',
    taskBackground: '#f8f5ff',  
    completedTask: '#e8e0f7'    
  },
  dark: {
    name: 'Dark Mode',
    primary: '#10b981',        
    secondary: '#059669',      
    accent: '#34d399',         
    text: '#ffffff',          
    secondtext: '#d1d5db',     
    calendarBackground: '#111827',  
    taskBackground: '#1f2937',      
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
    primary: '#ff5722',        
    secondary: '#fff3e0',       
    accent: '#ff8a65',          
    text: '#212121',
    secondtext: '#212121',
    calendarBackground: '#ffffff',
    taskBackground: '#fff8e6',   
    completedTask: '#ffecb3'     
  },
  professional: {
    name: 'Professional',
    primary: '#1a237e',         
    secondary: '#e8eaf6',       
    accent: '#3949ab',          
    text: '#212121',           
    secondtext: '#212121',
    calendarBackground: '#ffffff', 
    taskBackground: '#e8eaf6',   
    completedTask: '#d1d9ff'     
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
    const [dateTasksMap, setDateTasksMap] = useState({});
    const { addNotification } = useNotifications();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // Calendar info state
    const [calendarInfo, setCalendarInfo] = useState(null);
    
    // Task timing state
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    
    // Category state
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(null);
    
    // Priority state
    const [taskPriority, setTaskPriority] = useState('medium');
    const [priorityFilter, setPriorityFilter] = useState(null);
    const [prioritySort, setPrioritySort] = useState('high_first');
    const [dateSort, setDateSort] = useState('asc');

    // Current user state
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem(`calendar_theme_${calendarId}`);
        if (savedTheme && themes[savedTheme]) {
            setCurrentTheme(savedTheme);
        }
        
        // Load current user info
        loadCurrentUser();
    }, [calendarId]);

    const loadCurrentUser = async () => {
        try {
            console.log('=== DEBUG loadCurrentUser ===');
            console.log('Access token:', localStorage.getItem('access'));
            
            // Încearcă să extragi username-ul din token JWT
            const token = localStorage.getItem('access');
            if (!token) {
                console.log('No access token found');
                return;
            }
            
            try {
                // Decodifică payload-ul JWT
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log('Token payload:', payload);
                
                // Încearcă să găsești username-ul în token
                const username = payload.username || payload.user || payload.sub || payload.user_id || payload.email;
                console.log('Username from token:', username);
                
                if (username) {
                    // Folosește endpoint-ul pentru profil cu username-ul
                    const response = await axios.get(`http://127.0.0.1:8000/api/profile/${username}/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log('Profile response:', response.data);
                    setCurrentUser(response.data);
                    return;
                }
            } catch (tokenError) {
                console.log('Error parsing token:', tokenError);
            }
            
            // Dacă nu am găsit username în token, încearcă să-l găsești în localStorage
            const savedUsername = localStorage.getItem('username');
            if (savedUsername) {
                console.log('Username from localStorage:', savedUsername);
                const response = await axios.get(`http://127.0.0.1:8000/api/profile/${savedUsername}/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Profile response:', response.data);
                setCurrentUser(response.data);
                return;
            }
            
            console.log('No username found in token or localStorage');
            
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    };

    const formatLocalDate = (date) => {
        const localDate = new Date(date);
        
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    };

    const loadCalendarInfo = useCallback(async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/shared-calendars/${calendarId}/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setCalendarInfo(response.data);
        } catch (error) {
            console.error("Error fetching calendar info:", error);
        }
    }, [calendarId]);

    const loadCategories = useCallback(async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/shared-calendars/${calendarId}/categories/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setCategories(response.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }, [calendarId]);

    const loadTasks = useCallback(async (date) => {
        try {
            const formattedDate = formatLocalDate(date);
            console.log("Loading shared tasks for formatted date:", formattedDate);
            
            const token = localStorage.getItem('access');
            if (!token) {
                console.error("No access token found");
                return;
            }

            const response = await axios.get(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/sorted`, {
                params: { 
                    date: formattedDate,
                    priority_sort: prioritySort !== 'date_only' ? prioritySort : undefined,
                    date_sort: dateSort
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log("Raw response data:", response.data);
            
            // Filter tasks to only show those for the selected date
            let filteredTasks = response.data.filter(task => {
                const taskDate = task.date;
                console.log(`Comparing task date ${taskDate} with selected date ${formattedDate}`);
                return taskDate === formattedDate;
            });
            
            // Apply priority filter if set
            if (priorityFilter) {
                filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
            }
            
            console.log("Filtered tasks for date:", filteredTasks);
            setTasks(filteredTasks);
            
        } catch (error) {
            console.error("Error fetching shared tasks:", error);
            // Try the sorted endpoint if available
            try {
                const response = await axios.get(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/sorted/`, {
                    params: { 
                        date: formatLocalDate(date),
                        priority_sort: prioritySort,
                        date_sort: dateSort
                    },
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
                
                let filteredTasks = response.data.filter(task => task.date === formatLocalDate(date));
                if (priorityFilter) {
                    filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
                }
                setTasks(filteredTasks);
            } catch (fallbackError) {
                console.error("Fallback error:", fallbackError);
                setTasks([]); // Set empty array if both requests fail
            }
        }
    }, [calendarId, priorityFilter, prioritySort, dateSort]);

    // Load month tasks for calendar view
    useEffect(() => {
        const fetchMonthTasks = async () => {
            try {
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                const response = await axios.get(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/`, {
                    params: {
                        start_date: formatLocalDate(firstDay),
                        end_date: formatLocalDate(lastDay)
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
                console.error("Error fetching shared month tasks:", error);
            }
        };
        
        fetchMonthTasks();
    }, [currentMonth, calendarId]);

    useEffect(() => {
        if (calendarId) {
            loadTasks(selectedDate);
            loadCategories();
            loadCalendarInfo();
        }
    }, [calendarId, selectedDate, loadTasks, loadCategories, loadCalendarInfo]);

    // Reload tasks when priority sort or date sort changes
    useEffect(() => {
        if (calendarId && selectedDate) {
            loadTasks(selectedDate);
        }
    }, [prioritySort, dateSort, priorityFilter]);

    const refreshLeaderboard = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const getFilteredTasks = () => {
        let filtered = tasks;
        
        // Filter by category
        if (categoryFilter !== null) {
            filtered = filtered.filter(task => String(task.category) === String(categoryFilter));
        }
        
        if (priorityFilter !== null) {
            filtered = filtered.filter(task => task.priority === priorityFilter);
        }
        
        return filtered;
    };

    const handleDateChange = (newDate) => {
        console.log("Date changed to:", newDate);
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
        setSelectedCategory('');
        setTaskPriority('medium');
    };

    const changeMonth = (increment) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + increment);
        setCurrentMonth(newMonth);
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
            loadCategories(); // Refresh categories in case new ones were added
        } catch (error) {
            console.error("Error saving shared task:", error);
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
            await axios.delete(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/${taskId}/delete/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            loadTasks(selectedDate);
            
            const dateKey = formatLocalDate(selectedDate);
            const currentDateTasks = dateTasksMap[dateKey] || [];
            const updatedTasks = currentDateTasks.filter(t => t.id !== taskId);

            refreshLeaderboard();
            
            setDateTasksMap({
                ...dateTasksMap,
                [dateKey]: updatedTasks
            });
        } catch (error) {
            console.error("Error deleting shared task:", error);
        }
    };

    const toggleTaskCompletion = async (task) => {
        try {
            console.log('Toggle task completion started for task:', task);
            
            await toggleSharedTaskCompletion(calendarId, task.id, task);
            
            console.log('Task toggled successfully');
            loadTasks(selectedDate);
            
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
            refreshLeaderboard();
        } catch (error) {
            console.error("Error toggling task:", error);
        }
    };

    const handleJoinTask = async (task) => {
        try {
            console.log('=== DEBUG handleJoinTask ===');
            console.log('Joining task:', task.title);
            console.log('Before join - isUserJoined:', isUserJoined(task));
            
            const response = await axios.post(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/${task.id}/join/`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            
            console.log('Join task response:', response.data);
            
            // Refresh tasks to show updated joined users
            await loadTasks(selectedDate);
            
            console.log('After join - tasks refreshed');
            
            addNotification({
                type: 'success',
                title: 'Joined Successfully! 🤝',
                message: `You have joined the task "${task.title}"`
            });
        } catch (error) {
            console.error("Error joining task:", error);
            addNotification({
                type: 'error',
                title: 'Join Failed',
                message: 'Unable to join the task. Please try again.'
            });
        }
    };

    const handleLeaveTask = async (task) => {
        try {
            console.log('=== DEBUG handleLeaveTask ===');
            console.log('Leaving task:', task.title);
            console.log('Before leave - isUserJoined:', isUserJoined(task));
            
            const response = await axios.post(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/${task.id}/leave/`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            
            console.log('Leave task response:', response.data);
            
            // Refresh tasks to show updated joined users
            await loadTasks(selectedDate);
            
            console.log('After leave - tasks refreshed');
            
            addNotification({
                type: 'success',
                title: 'Left Successfully! 👋',
                message: `You have left the task "${task.title}"`
            });
        } catch (error) {
            console.error("Error leaving task:", error);
            addNotification({
                type: 'error',
                title: 'Leave Failed',
                message: 'Unable to leave the task. Please try again.'
            });
        }
    };

    const isUserJoined = (task) => {
        console.log('=== DEBUG isUserJoined ===');
        console.log('currentUser:', currentUser);
        console.log('currentUser.id:', currentUser?.id);
        console.log('currentUser.username:', currentUser?.username);
        console.log('task.joined_users:', task.joined_users);
        
        if (!currentUser || !task.joined_users) {
            console.log('No currentUser or joined_users');
            return false;
        }
        
        // Încearcă să găsești utilizatorul prin ID
        const foundById = task.joined_users.some(user => {
            console.log('Comparing user ID:', user.id, 'with currentUser.id:', currentUser.id);
            return user.id === currentUser.id;
        });
        
        // Încearcă să găsești utilizatorul prin username
        const foundByUsername = task.joined_users.some(user => {
            console.log('Comparing user username:', user.username, 'with currentUser.username:', currentUser.username);
            return user.username === currentUser.username;
        });
        
        console.log('Found by ID:', foundById);
        console.log('Found by username:', foundByUsername);
        
        const result = foundById || foundByUsername;
        console.log('isUserJoined result:', result);
        console.log('============================');
        
        return result;
    };

    // Verifică dacă utilizatorul curent este creatorul taskului
    const isTaskCreatedByCurrentUser = (task) => {
        if (!currentUser || !currentUser.username) return false;
        
        // Verifică prin username
        return task.created_by_username === currentUser.username;
    };

    // Verifică dacă utilizatorul poate face join la task
    const canJoinTask = (task) => {
        return !isTaskCreatedByCurrentUser(task);
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

    const filteredTasks = getFilteredTasks();

    const themeStyle = {
        '--primary-color': themes[currentTheme].primary,
        '--secondary-color': themes[currentTheme].secondary,
        '--accent-color': themes[currentTheme].accent,
        '--text-color': themes[currentTheme].text,
        '--secondtext-color': themes[currentTheme].secondtext,
        '--calendar-bg': themes[currentTheme].calendarBackground,
        '--task-bg': themes[currentTheme].taskBackground,
        '--completed-task-bg': themes[currentTheme].completedTask,
        '--primary-transparent': `${themes[currentTheme].primary}1a` ,
        '--glass-bg-dynamic': currentTheme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.1)',
        '--glass-border-dynamic': currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
        '--sidebar-bg': currentTheme === 'dark' ? '#1f2937' : 'var(--glass-bg)'
    };

    return (
        <div className="calendar-page" style={themeStyle}>
            <div className="calendar-sidebar">
                <div className="calendar-header">
                    <h2>{calendarInfo ? calendarInfo.name : 'Loading...'}</h2>
                    <div className="header-buttons">
                        <button 
                            onClick={toggleThemeSelector}
                            className="theme-button"
                            title="Change Theme"
                        >
                            <span role="img" aria-label="Theme">🎨</span>
                        </button>
                    </div>
                </div>
                
                {showThemeSelector && (
                    <div className="theme-selector">
                        <h4>Select Theme</h4>
                        <div className="theme-options">
                            {Object.keys(themes).map(themeName => {
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
                            <p>No tasks {categoryFilter && categoryFilter !== 'all' ? 'in this category' : 'for this date'}.</p>
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
                                                onChange={() => toggleTaskCompletion(task)} 
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
                                            
                                            <div className="task-priority-creator">
                                                {task.priority && (
                                                    <div className={`task-priority priority-${task.priority} theme-based`}>
                                                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                                                    </div>
                                                )}
                                                
                                                {/* Show who created the task */}
                                                {task.created_by_username && (
                                                    <div className="task-creator purple">
                                                        <span className="creator-label">👤</span>
                                                        <span className="creator-name">
                                                            {task.created_by_username}
                                                            {isTaskCreatedByCurrentUser(task) && ' (You)'}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {/* Show joined users */}
                                                {task.joined_users && task.joined_users.length > 0 && (
                                                    <div className="joined-users-container">
                                                        {task.joined_users.map(user => (
                                                            <div key={user.id} className="task-creator purple">
                                                                <span className="creator-label">👤</span>
                                                                <span className="creator-name">
                                                                    {user.username}
                                                                    {user.id === currentUser?.id && ' (You)'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="task-join-container">
                                            {canJoinTask(task) && (
                                                <label className={`join-checkbox ${isUserJoined(task) ? 'joined-state' : ''}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isUserJoined(task)}
                                                        onChange={() => {
                                                            if (isUserJoined(task)) {
                                                                handleLeaveTask(task);
                                                            } else {
                                                                handleJoinTask(task);
                                                            }
                                                        }}
                                                    />
                                                    <span className="join-checkmark"></span>
                                                    <span className="join-icon">
                                                        {isUserJoined(task) ? '👋' : '🤝'}
                                                    </span>
                                                    <span className="join-label">
                                                        {isUserJoined(task) ? 'Leave' : 'Join'}
                                                    </span>
                                                </label>
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
                        <Leaderboard calendarId={calendarId} 
                        refreshTrigger={refreshTrigger}/>
                    </div>
                )}
            </div>

            <div className='calendar-filter'>
                {/* Use SharedTaskCategory component for category management */}
                <SharedTaskCategory 
                    calendarId={calendarId}
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
                                
                                <option value="none">Date Only</option>
                                <option value="high_first">High Priority First</option>
                                <option value="low_first">Low Priority First</option>
                            </select>
                            
                            <select 
                                value={dateSort} 
                                onChange={(e) => setDateSort(e.target.value)}
                                className="sort-select"
                            >
                                <option value="asc">Newest First</option>
                                <option value="desc">Oldest First</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SharedCalendarPage;