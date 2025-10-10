import React, { useState, useEffect } from 'react';
import { fetchTasks } from '../ApiService'; // Use existing single-date function
import './AvailabilityChecker.css';

const AvailabilityChecker = ({ onClose, onAddTask, selectedDate }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');
  const [availabilityData, setAvailabilityData] = useState(null);

  // Helper function to format date consistently
  const formatDateForAPI = (date) => {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = formatDateForAPI(selectedDate);
      setStartDate(formattedDate);
      
      const endDateObj = new Date(selectedDate);
      endDateObj.setDate(endDateObj.getDate() + 7);
      setEndDate(formatDateForAPI(endDateObj));
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

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      setError('Date range should not exceed 30 days');
      return false;
    }

    return true;
  };

  // Fetch tasks for multiple dates by calling the single-date API multiple times
  const fetchTasksInRange = async (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log("Fetching tasks from", startDate, "to", endDate);
    
    // Create array of dates in the range
    const dates = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log("Will fetch tasks for", dates.length, "dates");
    
    // Fetch tasks for each date
    const fetchPromises = dates.map(async (date) => {
      try {
        console.log("Fetching tasks for date:", formatDateForAPI(date));
        const tasks = await fetchTasks(date);
        console.log(`Found ${tasks?.length || 0} tasks for ${formatDateForAPI(date)}`);
        
        // Add the date to each task for easier processing
        return (tasks || []).map(task => ({
          ...task,
          date: formatDateForAPI(date) // Ensure consistent date format
        }));
      } catch (error) {
        console.error(`Error fetching tasks for ${formatDateForAPI(date)}:`, error);
        // Return empty array for this date instead of failing completely
        return [];
      }
    });
    
    try {
      const taskArrays = await Promise.all(fetchPromises);
      // Flatten the array of arrays
      const flatTasks = taskArrays.flat();
      
      console.log("Total tasks fetched:", flatTasks.length);
      console.log("All tasks:", flatTasks);
      
      return flatTasks;
    } catch (error) {
      console.error("Error in Promise.all:", error);
      throw error;
    }
  };

  const checkAvailability = async () => {
    if (!validateDates()) return;

    setIsCalculating(true);
    setError('');
    
    try {
        console.log("Checking availability from", startDate, "to", endDate);
        
        // Use our custom function that calls the existing API multiple times
        const tasks = await fetchTasksInRange(startDate, endDate);

        console.log("Final task data:", tasks);
        console.log("Number of tasks returned:", tasks?.length || 0);
        
        // Process tasks to calculate availability for each day
        const availability = calculateAvailabilityByDay(tasks || [], startDate, endDate);
        
        console.log("Calculated availability:", availability);
        setAvailabilityData(availability);
    } catch (error) {
        console.error("Error fetching availability data:", error);
        console.error("Error response:", error.response?.data);
        console.error("Error status:", error.response?.status);
        
        if (error.response?.status === 401) {
            setError('Authentication failed. Please log in again.');
        } else if (error.message.includes('No authentication token')) {
            setError('Please log in to check availability.');
        } else {
            setError(`Failed to calculate availability: ${error.response?.data?.detail || error.message}`);
        }
    } finally {
        setIsCalculating(false);
    }
  };

  const calculateAvailabilityByDay = (tasks, start, end) => {
    console.log("Calculating availability for tasks:", tasks);
    console.log("Date range:", start, "to", end);
    
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    
    const dayAvailability = {};
    
    // Initialize each day in the range
    let currentDate = new Date(startDateObj);
    while (currentDate <= endDateObj) {
        const dateKey = formatDateForAPI(currentDate);
        
        dayAvailability[dateKey] = {
            date: dateKey,
            tasks: [],
            busyHours: 0,
            status: 'available'
        };
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log("Initialized day availability:", Object.keys(dayAvailability));
    
    // Assign tasks to their respective days
    tasks.forEach(task => {
        let taskDate = null;
        
        if (task.date) {
            if (typeof task.date === 'string') {
                taskDate = task.date.split('T')[0];
            } else {
                taskDate = formatDateForAPI(new Date(task.date));
            }
        }
        
        console.log("Processing task:", task.title || task.id, "with date:", taskDate);
        
        if (taskDate && dayAvailability[taskDate]) {
            dayAvailability[taskDate].tasks.push(task);
            console.log("Added task to", taskDate, "- now has", dayAvailability[taskDate].tasks.length, "tasks");
            
            // Calculate busy hours based on task duration
            if (!task.is_all_day && task.start_time && task.end_time) {
                try {
                    const [startHour, startMinute] = task.start_time.split(':').map(Number);
                    const [endHour, endMinute] = task.end_time.split(':').map(Number);
                    
                    const durationHours = (endHour - startHour) + (endMinute - startMinute) / 60;
                    dayAvailability[taskDate].busyHours += Math.max(0, durationHours);
                } catch (e) {
                    console.warn("Error parsing task times:", task.start_time, task.end_time);
                    dayAvailability[taskDate].busyHours += 1; // Default 1 hour
                }
            } else {
                // For all-day tasks, count as 8 hours by default
                dayAvailability[taskDate].busyHours += 8;
            }
        } else {
            console.log("Task date", taskDate, "not in range or invalid");
        }
    });
    
    // Calculate status for each day
    const WORKING_HOURS = 14;
    
    Object.keys(dayAvailability).forEach(date => {
        const day = dayAvailability[date];
        const taskCount = day.tasks.length;
        const busyRatio = day.busyHours / WORKING_HOURS;
        
        console.log(`Day ${date}: ${taskCount} tasks, ${day.busyHours.toFixed(1)} busy hours, ${(busyRatio * 100).toFixed(1)}% busy`);
        
        if (busyRatio >= 0.7 || taskCount >= 5) {
            day.status = 'busy';
        } else if (busyRatio >= 0.3 || taskCount >= 2) {
            day.status = 'somewhat-busy';
        } else if (taskCount > 0) {
            day.status = 'somewhat-busy';
        } else {
            day.status = 'available';
        }
    });
    
    return dayAvailability;
  };

  const handleAddTask = (date, suggestedStartTime = '09:00', suggestedEndTime = '10:00') => {
    if (onAddTask) {
      const dateObj = new Date(date + 'T00:00:00');
      onAddTask(dateObj, suggestedStartTime, suggestedEndTime);
    }
  };

  // Find best available time slot for a given day
  const findBestTimeSlot = (dateKey) => {
    if (!availabilityData || !availabilityData[dateKey]) return { start: '09:00', end: '10:00' };
    
    const dayData = availabilityData[dateKey];
    const tasks = dayData.tasks;
    
    const workStart = 8;
    const workEnd = 22;
    const bufferTime = 1; // 1 hour buffer between tasks
    
    if (tasks.length === 0) {
      return { start: '09:00', end: '10:00' };
    }
    
    const busySlots = tasks
      .filter(task => !task.is_all_day && task.start_time && task.end_time)
      .map(task => {
        try {
          const [startHour, startMinute] = task.start_time.split(':').map(Number);
          const [endHour, endMinute] = task.end_time.split(':').map(Number);
          
          return {
            start: startHour + startMinute / 60,
            end: endHour + endMinute / 60
          };
        } catch (e) {
          console.warn("Error parsing task times for slot finding:", task.start_time, task.end_time);
          return null;
        }
      })
      .filter(Boolean);
    
    busySlots.sort((a, b) => a.start - b.start);
    
    let bestStart = workStart;
    let bestDuration = 0;
    
    // Check gap before first task
    if (busySlots.length > 0 && busySlots[0].start > workStart) {
      const gap = busySlots[0].start - workStart;
      if (gap >= 1 && gap > bestDuration) {
        bestStart = workStart;
        bestDuration = gap;
      }
    }
    
    // Check gaps between tasks
    for (let i = 0; i < busySlots.length - 1; i++) {
      const gap = busySlots[i + 1].start - busySlots[i].end;
      if (gap >= (1 + bufferTime) && gap > bestDuration) {
        bestStart = busySlots[i].end + bufferTime; 
        bestDuration = gap - bufferTime;
      }
    }
    
    // Check gap after last task
    if (busySlots.length > 0) {
      const lastEnd = busySlots[busySlots.length - 1].end;
      if (lastEnd < workEnd) {
        const gap = workEnd - lastEnd;
        if (gap >= (1 + bufferTime) && gap > bestDuration) {
          bestStart = lastEnd + bufferTime; 
          bestDuration = gap - bufferTime;
        }
      }
    }
    
    // If no suitable gap found, default to 9 AM
    if (bestDuration < 1) {
      return { start: '09:00', end: '10:00' };
    }
    
    const formatTimeString = (timeValue) => {
      const hours = Math.floor(timeValue);
      const minutes = Math.round((timeValue - hours) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    return {
      start: formatTimeString(bestStart),
      end: formatTimeString(bestStart + 1)
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
                      <span className="date-display">
                        {new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className={`status-badge ${day.status}`}>
                        {day.status === 'available' ? 'Available' : 
                         day.status === 'somewhat-busy' ? 'Somewhat Busy' : 'Busy'}
                      </span>
                    </div>
                    
                    <div className="availability-details">
                      <div className="task-count">
                        {day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''}
                      </div>
                      
                      <button 
                        className="add-task-btn"
                        onClick={() => handleAddTask(dateKey, timeSlot.start, timeSlot.end)}
                      >
                        Add Task at {timeSlot.start}
                      </button>
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