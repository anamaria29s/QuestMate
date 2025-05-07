import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css'; 

const CalendarPage = () => {
    const [tasks, setTasks] = useState([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingTask, setEditingTask] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isAdding, setIsAdding] = useState(false);

    const fetchTasks = async (date) => {
        try {
            const formattedDate = date.toISOString().split('T')[0];
            const response = await axios.get(`http://127.0.0.1:8000/api/tasks/?date=${formattedDate}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setTasks(response.data);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    useEffect(() => {
        fetchTasks(selectedDate);
    }, [selectedDate]);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        // Reset form when changing dates
        setIsAdding(false);
        setEditingTask(null);
        setTaskTitle('');
        setTaskDescription('');
    };

    const changeMonth = (increment) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + increment);
        setCurrentMonth(newMonth);
    };

    const handleTaskSubmit = async () => {
        if (!taskTitle.trim()) return;
        
        try {
            if (editingTask) {
                await axios.put(`http://127.0.0.1:8000/api/tasks/${editingTask.id}/edit/`, {
                    date: selectedDate.toISOString().split('T')[0],
                    title: taskTitle,
                    description: taskDescription,
                }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
            } else {
                await axios.post('http://127.0.0.1:8000/api/tasks/add/', {
                    date: selectedDate.toISOString().split('T')[0],  
                    title: taskTitle,
                    description: taskDescription
                }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
            }
            
            setTaskTitle('');
            setTaskDescription('');
            setEditingTask(null);
            setIsAdding(false);
            fetchTasks(selectedDate);
        } catch (error) {
            console.error("Error saving task:", error);
        }
    };

    const handleEdit = (task) => {
        setEditingTask(task);
        setTaskTitle(task.title);
        setTaskDescription(task.description);
        setIsAdding(true);
    };

    const handleDelete = async (taskId) => {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/tasks/${taskId}/delete/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            fetchTasks(selectedDate);
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const toggleTaskCompletion = async (task) => {
        try {
            await axios.put(`http://127.0.0.1:8000/api/tasks/${task.id}/toggle/`, {
                ...task,
                completed: !task.completed,
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            fetchTasks(selectedDate);
        } catch (error) {
            console.error("Error toggling task:", error);
        }
    };

    const cancelEditing = () => {
        setEditingTask(null);
        setTaskTitle('');
        setTaskDescription('');
        setIsAdding(false);
    };

    const tileClassName = ({ date }) => {
        // Format date to match the format used in tasks
        const formattedDate = date.toISOString().split('T')[0];
        
        // Check if there are any tasks for this date
        const hasTasksOnDate = tasks.some(task => 
            new Date(task.date).toISOString().split('T')[0] === formattedDate
        );
        
        return hasTasksOnDate ? 'has-tasks' : null;
    };

    // Get today's date for the formatted display
    const formatSelectedDate = () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return selectedDate.toLocaleDateString(undefined, options);
    };

    return (
        <div className="calendar-page">
            <div className="calendar-sidebar">
                <div className="calendar-header">
                    <h2>Tasks Calendar</h2>
                </div>
                
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
                />
                
                <div className="add-task-button-container">
                    <button 
                        onClick={() => setIsAdding(!isAdding)} 
                        className={`add-task-button ${isAdding ? 'active' : ''}`}
                    >
                        {isAdding ? 'Cancel' : '+ Add New Task'}
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
                        <div className="form-buttons">
                            <button onClick={cancelEditing} className="cancel-btn">Cancel</button>
                            <button 
                                onClick={handleTaskSubmit} 
                                className="submit-btn"
                                disabled={!taskTitle.trim()}
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
                                        <h4>{task.title}</h4>
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
        </div>
    );
};

export default CalendarPage;