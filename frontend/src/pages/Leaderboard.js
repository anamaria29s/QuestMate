import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Leaderboard = ({ calendarId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://127.0.0.1:8000/api/calendars/${calendarId}/leaderboard/`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
          }
        );
        setLeaderboard(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard data");
        setLoading(false);
      }
    };

    if (calendarId) {
      fetchLeaderboard();
    }
  }, [calendarId]);

  if (loading) return <div className="leaderboard-loading">Loading leaderboard...</div>;
  if (error) return <div className="leaderboard-error">{error}</div>;

  return (
    <div className="leaderboard-container">
      <h3 className="leaderboard-title">Leaderboard</h3>
      {leaderboard.length === 0 ? (
        <p className="no-data">No data available</p>
      ) : (
        <div className="leaderboard-entries">
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.username} 
              className="leaderboard-entry"
            >
              <div className="entry-user">
                <span className={`entry-rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}`}>
                  #{index + 1}
                </span>
                <span className="entry-username">{entry.username}</span>
              </div>
              <div className="entry-score">
                {entry.tasks_completed} tasks
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;