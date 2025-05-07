import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          'http://127.0.0.1:8000/api/user/achievements/',
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
          }
        );
        setAchievements(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching achievements:", err);
        setError("Failed to load achievements data");
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  if (loading) return <div className="achievements-loading">Loading achievements...</div>;
  if (error) return <div className="achievements-error">{error}</div>;

  return (
    <div className="achievements-container">
      <h3 className="achievements-title">My Achievements</h3>
      {achievements.length === 0 ? (
        <p className="no-achievements">You haven't earned any achievements yet. Keep completing tasks!</p>
      ) : (
        <div className="achievements-grid">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="achievement-card">
              <div className="achievement-icon">
                {/* Add icon based on achievement.achievement.icon */}
                {achievement.achievement.icon === 'trophy' && '🏆'}
                {achievement.achievement.icon === 'star' && '⭐'}
                {achievement.achievement.icon === 'award' && '🏅'}
                {achievement.achievement.icon === 'sunrise' && '🌅'}
                {achievement.achievement.icon === 'calendar' && '📅'}
                {achievement.achievement.icon === 'check-circle' && '✅'}
                {achievement.achievement.icon === 'trending-up' && '📈'}
                {achievement.achievement.icon === 'activity' && '📊'}
                {achievement.achievement.icon === 'zap' && '⚡'}
                {achievement.achievement.icon === 'play' && '▶️'}
              </div>
              <div className="achievement-details">
                <h4 className="achievement-name">{achievement.achievement.name}</h4>
                <p className="achievement-description">{achievement.achievement.description}</p>
                <p className="achievement-date">Earned on: {new Date(achievement.date_earned).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Achievements;