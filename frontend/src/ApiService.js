import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const fetchTasks = async (date) => {
  const formattedDate = date.toISOString().split('T')[0];
  const response = await axios.get(`${API_URL}/tasks/?date=${formattedDate}`);
  return response.data;
};

export const toggleTaskCompletion = async (taskId, task) => {
  const response = await axios.put(`${API_URL}/tasks/${taskId}/toggle/`, {
    ...task,
    completed: !task.completed,
  });
  return response.data;
};

export const fetchSharedTasks = async (calendarId, date) => {
  const formattedDate = date.toISOString().split('T')[0];
  const response = await axios.get(`${API_URL}/shared-tasks/${calendarId}/?date=${formattedDate}`);
  return response.data;
};

export const toggleSharedTaskCompletion = async (calendarId, taskId, task) => {
  const response = await axios.put(`${API_URL}/shared-tasks/${calendarId}/${taskId}/toggle/`, {
    ...task,
    completed: !task.completed,
  });
  return response.data;
};

export const fetchUserAchievements = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/achievements/`);
      return response.data || [];
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      return []; 
    }
  };

  export const checkNewAchievements = async () => {
    try {
        const lastChecked = localStorage.getItem('last_achievements_check') || '2000-01-01T00:00:00Z';
        
        console.log('Checking for achievements since:', lastChecked);
        
        const response = await axios.get('http://127.0.0.1:8000/api/user/achievements/', {
            headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
        });
        
        console.log('Current achievements after task completion:', response.data);
        
        const newAchievements = response.data.filter(achievement => {
            return new Date(achievement.date_earned) > new Date(lastChecked);
        });
        
        console.log('Recent achievements found:', newAchievements);
        
        localStorage.setItem('last_achievements_check', new Date().toISOString());
        
        return newAchievements;
    } catch (error) {
        console.error("Error checking new achievements:", error);
        return [];
    }
};
