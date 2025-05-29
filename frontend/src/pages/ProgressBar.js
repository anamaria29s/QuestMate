import React from 'react';
import './ProgressBar.css';

const TaskProgressBar = ({ tasks }) => {
  // Calculate task completion statistics
  const calculateTaskStats = () => {
    if (tasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    
    return { completed: completedTasks, total: totalTasks, percentage };
  };

  const taskStats = calculateTaskStats();
  
  // Determine status based on completion percentage
  const getStatusText = () => {
    if (taskStats.percentage === 100) return 'completed';
    if (taskStats.percentage > 0) return 'in-progress';
    return 'not-started';
  };
  
  const status = getStatusText();
  
  return (
    <div className="daily-progress-section">
      <h4>Daily Task Progress</h4>
      
      <div className="task-progress-container" data-percentage={taskStats.percentage}>
        <div className="progress-stats">
          <div className="progress-text">
            {taskStats.completed} of {taskStats.total} tasks completed ({taskStats.percentage}%)
          </div>
          <div className={`status-badge ${status}`}>
            {status === 'completed' ? 'Complete' : 'In Progress'}
          </div>
        </div>
        
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill"
            style={{ width: `${taskStats.percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default TaskProgressBar;