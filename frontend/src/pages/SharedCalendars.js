import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SharedCalendars.css';

const SharedCalendars = () => {
  const [calendars, setCalendars] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [calendarName, setCalendarName] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [selectedCalendarId, setSelectedCalendarId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [receiverId, setReceiverId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCalendars();
    fetchFriends();
  }, []);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access');
      const response = await axios.get('http://127.0.0.1:8000/api/shared-calendars/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCalendars(response.data.calendars || []);
      setPendingInvites(response.data.pending_invites || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching shared calendars:', error);
      setError('Failed to load calendars. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await axios.get('http://127.0.0.1:8000/api/friends/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFriends(response.data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleCreateCalendar = async () => {
    if (!calendarName.trim()) {
      setError('Please enter a calendar name');
      return;
    }
    
    const token = localStorage.getItem("access");
    if (!token) return;
    
    try {
      setLoading(true);
      await axios.post('http://127.0.0.1:8000/api/shared-calendars/create/', {
        name: calendarName,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      setCalendarName('');
      fetchCalendars();
      setError(null);
    } catch (error) {
      console.error('Error creating calendar:', error);
      setError('Failed to create calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedCalendarId) {
      setError('Please select a calendar');
      return;
    }
    
    if (!receiverId) {
      setError('Please select a friend to invite');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('http://127.0.0.1:8000/api/shared-calendars/invite/', {
        calendar_id: selectedCalendarId,
        receiver_id: receiverId,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
      setInviteUsername('');
      setSelectedCalendarId(null);
      setReceiverId(null);
      fetchCalendars();
      setError(null);
    } catch (error) {
      console.error('Error sending invite:', error);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (membershipId) => {
    try {
      setLoading(true);
      await axios.post('http://127.0.0.1:8000/api/shared-calendars/accept/', {
        membership_id: membershipId,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
      fetchCalendars();
    } catch (error) {
      console.error('Error accepting invite:', error);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (membershipId) => {
    try {
      setLoading(true);
      await axios.post('http://127.0.0.1:8000/api/shared-calendars/decline/', {
        membership_id: membershipId,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
      fetchCalendars();
    } catch (error) {
      console.error('Error declining invite:', error);
      setError('Failed to decline invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (e) => {
    const input = e.target.value;
    setInviteUsername(input);
    if (input.length === 0) {
      setFilteredFriends([]);
    } else {
      const filtered = friends.filter(f =>
        f.username.toLowerCase().startsWith(input.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  };

  const handleSelectFriend = (friend) => {
    setInviteUsername(friend.username);
    setReceiverId(friend.id);
    setFilteredFriends([]);
  };

  return (
    <div className="shared-calendars-container">
      <div className="shared-calendars-header">
        <h2>Shared Calendars</h2>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="shared-calendars-content">
        <div className="card calendars-list">
          <h3>Your Calendars</h3>
          {loading ? (
            <div className="loader">Loading...</div>
          ) : calendars.length > 0 ? (
            <ul>
              {calendars.map((cal) => (
                <li key={cal.id} className="calendar-item">
                  <div className="calendar-info">
                    <span className="calendar-name">{cal.name}</span>
                    <span className="calendar-owner">Created by: {cal.owner}</span>
                  </div>
                  <Link to={`/shared-calendar/${cal.id}`} className="view-btn">View</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-message">No calendars available.</p>
          )}
        </div>

        <div className="card create-calendar">
          <h3>Create New Calendar</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Calendar Name"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              className="input-field"
            />
            <button
              onClick={handleCreateCalendar}
              className="action-btn create-btn"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        <div className="card invite-section">
          <h3>Invite to Calendar</h3>
          <div className="form-group">
            <select
              value={selectedCalendarId || ''}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="select-field"
            >
              <option value="">Select a calendar</option>
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group autocomplete-wrapper">
            <input
              type="text"
              placeholder="Friend's Username"
              value={inviteUsername}
              onChange={handleUsernameChange}
              className="input-field"
            />
            {filteredFriends.length > 0 && (
              <ul className="autocomplete-list">
                {filteredFriends.map((friend) => (
                  <li
                    key={friend.id}
                    onClick={() => handleSelectFriend(friend)} 
                    className="autocomplete-item"
                  >
                    {friend.username}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={handleInvite}
            className="action-btn invite-btn"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>

        {pendingInvites.length > 0 && (
          <div className="card pending-invites">
            <h3>Pending Invitations</h3>
            <ul>
              {pendingInvites.map((invite) => (
                <li key={invite.id} className="invite-item">
                  <div className="invite-info">
                    <span className="invite-calendar">{invite.calendar.name}</span>
                    <span className="invite-from">from {invite.calendar.owner}</span>
                  </div>
                  <div className="invite-actions">
                    <button
                      onClick={() => handleAccept(invite.id)}
                      className="action-btn accept-btn"
                      disabled={loading}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(invite.id)}
                      className="action-btn decline-btn"
                      disabled={loading}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedCalendars;