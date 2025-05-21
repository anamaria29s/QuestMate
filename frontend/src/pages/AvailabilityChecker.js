import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AvailabilityChecker.css';

const AvailabilityChecker = ({ onClose, onAddTask, selectedDate }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');
  const [availabilityData, setAvailabilityData] = useState(null);

  useEffect(() => {
    // Initialize with the selected date if provided
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setStartDate(formattedDate);
      
      // Set end date to 7 days after start date by default
      const endDateObj = new Date(selectedDate);
      endDateObj.setDate(endDateObj.getDate() + 7);
      setEndDate(endDateObj.toISOString().split('T')[0]);
    }
  }, [selectedDate]);

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setError('');
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setError('');
  };

  const validateDates = () => {
    if (!startDate || !endDate) {
      setError('Both start and end dates are required');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setError('Start date must be before end date');
      return false;
    }

    // Check if date range is not too large (e.g., limit to 30 days)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      setError('Date range should not exceed 30 days');
      return false;
    }

    return true;
  };

  const checkAvailability = async () => {
    if (!validateDates()) return;

    setIsCalculating(true);
    
    try {
      // Fetch tasks within the selected date range
      const response = await axios.get('http://127.0.0.1:8000/api/tasks/', {
        params: {
          start_date: startDate,
          end_date: endDate
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
      });

      // Process tasks to calculate availability for each day
      const availability = calculateAvailabilityByDay(response.data, startDate, endDate);
      
      // Store the calculated availability in local state
      setAvailabilityData(availability);
    } catch (error) {
      console.error("Error fetching availability data:", error);
      setError('Failed to calculate availability. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateAvailabilityByDay = (tasks, start, end) => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const dayAvailability = {};
    
    // Initialize each day in the range
    let currentDate = new Date(startDateObj);
    while (currentDate <= endDateObj) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dayAvailability[dateKey] = {
        date: dateKey,
        tasks: [],
        busyHours: 0,
        status: 'available' // 'available', 'somewhat-busy', 'busy'
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Assign tasks to their respective days
    tasks.forEach(task => {
      const taskDate = task.date;
      if (dayAvailability[taskDate]) {
        dayAvailability[taskDate].tasks.push(task);
        
        // Calculate busy hours based on task duration
        if (!task.is_all_day && task.start_time && task.end_time) {
          const startHour = parseInt(task.start_time.split(':')[0]);
          const startMinute = parseInt(task.start_time.split(':')[1]);
          const endHour = parseInt(task.end_time.split(':')[0]);
          const endMinute = parseInt(task.end_time.split(':')[1]);
          
          const durationHours = (endHour - startHour) + (endMinute - startMinute) / 60;
          dayAvailability[taskDate].busyHours += durationHours;
        } else {
          // For all-day tasks, count as 8 hours by default
          dayAvailability[taskDate].busyHours += 8;
        }
      }
    });
    
    // Determine availability status for each day
    // Assuming working hours per day is around 12-14 hours (8am-10pm)
    const WORKING_HOURS = 14;
    
    Object.keys(dayAvailability).forEach(date => {
      const day = dayAvailability[date];
      const taskCount = day.tasks.length;
      const busyRatio = day.busyHours / WORKING_HOURS;
      
      if (busyRatio >= 0.7 || taskCount >= 5) {
        day.status = 'busy';
      } else if (busyRatio >= 0.3 || taskCount >= 2) {
        day.status = 'somewhat-busy';
      } else {
        day.status = 'available';
      }
    });
    
    return dayAvailability;
  };

  const handleAddTask = (date, suggestedStartTime = '09:00', suggestedEndTime = '10:00') => {
    if (onAddTask) {
      // Convert string date to Date object
      const dateObj = new Date(date);
      onAddTask(dateObj, suggestedStartTime, suggestedEndTime);
    }
  };

  // Find best available time slot for a given day
  const findBestTimeSlot = (dateKey) => {
    if (!availabilityData || !availabilityData[dateKey]) return { start: '09:00', end: '10:00' };
    
    const dayData = availabilityData[dateKey];
    const tasks = dayData.tasks;
    
    // Default working hours 8:00 AM to 10:00 PM
    const workStart = 8;
    const workEnd = 22;
    
    // If no tasks, suggest a morning slot
    if (tasks.length === 0) {
      return { start: '09:00', end: '10:00' };
    }
    
    // Collect all busy time slots for this day
    const busySlots = tasks
      .filter(task => !task.is_all_day && task.start_time && task.end_time)
      .map(task => {
        const startHour = parseInt(task.start_time.split(':')[0]);
        const startMinute = parseInt(task.start_time.split(':')[1]);
        const endHour = parseInt(task.end_time.split(':')[0]);
        const endMinute = parseInt(task.end_time.split(':')[1]);
        
        return {
          start: startHour + startMinute / 60,
          end: endHour + endMinute / 60
        };
      });
    
    // Sort busy slots by start time
    busySlots.sort((a, b) => a.start - b.start);
    
    // Find available gap of at least 1 hour
    let bestStart = workStart;
    let bestDuration = 0;
    
    // Check gap between work start and first meeting
    if (busySlots.length > 0 && busySlots[0].start > workStart) {
      const gap = busySlots[0].start - workStart;
      if (gap >= 1 && gap > bestDuration) {
        bestStart = workStart;
        bestDuration = gap;
      }
    }
    
    // Check gaps between meetings
    for (let i = 0; i < busySlots.length - 1; i++) {
      const gap = busySlots[i + 1].start - busySlots[i].end;
      if (gap >= 1 && gap > bestDuration) {
        bestStart = busySlots[i].end;
        bestDuration = gap;
      }
    }
    
    // Check gap between last meeting and end of work day
    if (busySlots.length > 0) {
      const lastEnd = busySlots[busySlots.length - 1].end;
      if (lastEnd < workEnd) {
        const gap = workEnd - lastEnd;
        if (gap >= 1 && gap > bestDuration) {
          bestStart = lastEnd;
          bestDuration = gap;
        }
      }
    }
    
    // If no suitable gap found, suggest early morning
    if (bestDuration < 1) {
      return { start: '09:00', end: '10:00' };
    }
    
    // Format time as HH:MM
    const formatTimeString = (timeValue) => {
      const hours = Math.floor(timeValue);
      const minutes = Math.round((timeValue - hours) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    return {
      start: formatTimeString(bestStart),
      end: formatTimeString(bestStart + 1) // Suggest 1 hour duration
    };
  };

  return (
    <div className="availability-modal">
      <div className="availability-modal-content">
        <div className="modal-header">
          <h3>Check Availability</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="date-inputs">
          <div className="date-input">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
            />
          </div>
          <div className="date-input">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
            />
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          className="check-availability-btn"
          onClick={checkAvailability}
          disabled={isCalculating}
        >
          {isCalculating ? 'Calculating...' : 'Check Availability'}
        </button>
        
        {availabilityData && (
          <div className="availability-results">
            <h4>Availability Results</h4>
            <div className="availability-list">
              {Object.keys(availabilityData).map(dateKey => {
                const day = availabilityData[dateKey];
                const timeSlot = findBestTimeSlot(dateKey);
                
                return (
                  <div key={dateKey} className={`availability-day ${day.status}`}>
                    <div className="date-info">
                      <span className="date-display">{new Date(dateKey).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className={`status-badge ${day.status}`}>
                        {day.status === 'available' ? 'Available' : 
                         day.status === 'somewhat-busy' ? 'Somewhat Busy' : 'Busy'}
                      </span>
                    </div>
                    
                    <div className="availability-details">
                      <div className="task-count">
                        {day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''}
                      </div>
                      
                      {day.status !== 'busy' && (
                        <button 
                          className="add-task-btn"
                          onClick={() => handleAddTask(dateKey, timeSlot.start, timeSlot.end)}
                        >
                          Add Task at {timeSlot.start}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityChecker;