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

  
    const fetchTasks = async (selectedDate) => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/tasks/', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access')}` 
                }
            });
            setTasks(response.data.filter(task => task.date === selectedDate.toISOString().split('T')[0]));
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    useEffect(() => {
        fetchTasks(selectedDate);
    }, [selectedDate]);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
    };

    const handleTaskSubmit = async () => {
        try {
            await axios.post('http://127.0.0.1:8000/api/tasks/add/', {
                date: selectedDate.toISOString().split('T')[0],  
                title: taskTitle,
                description: taskDescription
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access')}` 
                }
            });
            setTaskTitle('');
            setTaskDescription('');
            fetchTasks(selectedDate);  
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    return (
        <div className="calendar-page">
            <div className="calendar-container">
                <h2>Calendar</h2>
                <Calendar
                    onChange={handleDateChange}
                    value={selectedDate}
                />
            </div>

            <div className="tasks-container">
                <h3>Today's Tasks</h3>
                <ul>
                    {tasks.length === 0 ? (
                        <p>No tasks for today.</p>
                    ) : (
                        tasks.map(task => (
                            <li key={task.id}>
                                <h4>{task.title}</h4>
                                <p>{task.description}</p>
                            </li>
                        ))
                    )}
                </ul>

                <h3>Tasks for {selectedDate.toDateString()}</h3>
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
                <button onClick={handleTaskSubmit}>Add Task</button>
            </div>
        </div>
    );
};

export default CalendarPage;
