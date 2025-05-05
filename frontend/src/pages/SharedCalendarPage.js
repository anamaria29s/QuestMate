import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // ✅ Import useParams
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';

const SharedCalendarPage = () => {
    const { id: calendarId } = useParams(); // ✅ Use useParams to get calendar ID
    const [tasks, setTasks] = useState([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingTask, setEditingTask] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const fetchTasks = async (date) => {
        try {
            const formattedDate = date.toISOString().split('T')[0];
            const response = await axios.get(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/?date=${formattedDate}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setTasks(response.data);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };
    

    useEffect(() => {
        if (calendarId) {
            fetchTasks(selectedDate);
        }
    }, [calendarId, selectedDate]);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
    };

    const changeMonth = (increment) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + increment);
        setCurrentMonth(newMonth);
    };

    const handleTaskSubmit = async () => {
        const url = editingTask
            ? `http://127.0.0.1:8000/api/shared-tasks/${calendarId}/${editingTask.id}/edit/`
            : `http://127.0.0.1:8000/api/shared-tasks/${calendarId}/add/`;
    
        const method = editingTask ? axios.put : axios.post;
    
        await method(url, {
            date: selectedDate.toISOString().split('T')[0],
            title: taskTitle,
            description: taskDescription,
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
        });
    
        setEditingTask(null);
        setTaskTitle('');
        setTaskDescription('');
        setTimeout(() => fetchTasks(selectedDate), 500);
    };
    

    const handleEdit = (task) => {
        setEditingTask(task);
        setTaskTitle(task.title);
        setTaskDescription(task.description);
    };

    const handleDelete = async (taskId) => {
        await axios.delete(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/${taskId}/delete/`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
        });
        setTimeout(() => fetchTasks(selectedDate), 500);
    };

    const toggleTaskCompletion = async (task) => {
        await axios.put(`http://127.0.0.1:8000/api/shared-tasks/${calendarId}/${task.id}/toggle/`, {
            ...task,
            completed: !task.completed,
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
        });
        setTimeout(() => fetchTasks(selectedDate), 500);
    };

    return (
        <div className="calendar-page">
            <div className="calendar-container">
                <h2>Shared Calendar</h2>
                <div className="calendar-nav">
                    <button onClick={() => changeMonth(-1)}>← Previous</button>
                    <span>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => changeMonth(1)}>Next →</button>
                </div>
                <Calendar 
                    onChange={handleDateChange} 
                    value={selectedDate} 
                    activeStartDate={currentMonth}
                    onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
                />
            </div>

            <div className="tasks-container">
                <h3>Tasks for {selectedDate.toDateString()}</h3>
                <ul>
                    {tasks.length === 0 ? (
                        <p>No tasks for this date.</p>
                    ) : (
                        tasks.map(task => (
                            <li key={task.id} className={task.completed ? 'completed' : ''}>
                                <input 
                                    type="checkbox" 
                                    checked={task.completed} 
                                    onChange={() => toggleTaskCompletion(task)} 
                                />
                                <h4>{task.title}</h4>
                                <p>{task.description}</p>
                                <button onClick={() => handleEdit(task)}>Edit</button>
                                <button onClick={() => handleDelete(task.id)}>Delete</button>
                            </li>
                        ))
                    )}
                </ul>

                <h3>{editingTask ? 'Edit Task' : 'Add Task'}</h3>
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
                <button onClick={handleTaskSubmit}>{editingTask ? 'Update Task' : 'Add Task'}</button>
            </div>
        </div>
    );
};

export default SharedCalendarPage;
