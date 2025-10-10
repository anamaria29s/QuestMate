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
  const [success, setSuccess] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingCalendar, setEditingCalendar] = useState(null); 
  const [editCalendarName, setEditCalendarName] = useState(''); 

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
      setSuccess('Calendar created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating calendar:', error);
      setError('Failed to create calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCalendar = async (calendarId) => {
    if (!editCalendarName.trim()) {
      setError('Please enter a calendar name');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.put(`http://127.0.0.1:8000/api/shared-calendars/${calendarId}/edit/`, {
        name: editCalendarName,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      setSuccess(response.data.detail || 'Calendar updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setEditingCalendar(null);
      setEditCalendarName('');
      fetchCalendars();
      setError(null);
    } catch (error) {
      console.error('Error updating calendar:', error);
      if (error.response?.status === 403) {
        setError('Only the calendar owner can edit this calendar.');
      } else {
        setError(error.response?.data?.detail || 'Failed to update calendar. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (calendar) => {
    setEditingCalendar(calendar.id);
    setEditCalendarName(calendar.name);
  };

  const cancelEditing = () => {
    setEditingCalendar(null);
    setEditCalendarName('');
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
      setSuccess('Invitation sent successfully!');
      setTimeout(() => setSuccess(null), 3000);
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
      setSuccess('Invitation accepted successfully!');
      setTimeout(() => setSuccess(null), 3000);
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
      setSuccess('Invitation declined successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error declining invite:', error);
      setError('Failed to decline invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCalendar = async (calendarId, calendarName) => {
    try {
      setLoading(true);
      const response = await axios.delete(`http://127.0.0.1:8000/api/shared-calendars/${calendarId}/delete/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      setSuccess(response.data.detail || `Calendar "${calendarName}" deleted successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      setConfirmDelete(null);
      fetchCalendars();
    } catch (error) {
      console.error('Error deleting calendar:', error);
      if (error.response?.status === 403) {
        setError('Only the calendar owner can delete this calendar.');
      } else {
        setError(error.response?.data?.detail || 'Failed to delete calendar. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveCalendar = async (calendarId, calendarName) => {
    try {
      setLoading(true);
      const response = await axios.post(`http://127.0.0.1:8000/api/shared-calendars/${calendarId}/leave/`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      setSuccess(response.data.detail || `You have left "${calendarName}" successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchCalendars();
    } catch (error) {
      console.error('Error leaving calendar:', error);
      if (error.response?.status === 400) {
        setError(error.response.data.detail || 'Cannot leave this calendar.');
      } else {
        setError('Failed to leave calendar. Please try again.');
      }
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

  const getCurrentUser = () => {
    return localStorage.getItem('username'); 
  };

  const currentUser = getCurrentUser();

  return (
    <div className="shared-calendars-container">
      <div className="shared-calendars-header">
        <h2>Shared Calendars</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>

      {/* Delete Confirmation*/}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete "<strong>{confirmDelete.name}</strong>"?</p>
            <p className="warning-text">This action cannot be undone. All tasks, categories, and memberships will be permanently deleted.</p>
            <div className="modal-actions">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="action-btn cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteCalendar(confirmDelete.id, confirmDelete.name)}
                className="action-btn delete-btn"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Calendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="shared-calendars-content">
        <div className="card calendars-list">
          <h3>Your Calendars</h3>
          {loading ? (
            <div className="loader">Loading...</div>
          ) : calendars.length > 0 ? (
            <ul>
              {calendars.map((cal) => {
                const isOwner = cal.owner === currentUser;
                const isEditing = editingCalendar === cal.id;
                
                return (
                  <li key={cal.id} className="calendar-item">
                    <div className="calendar-info">
                      {isEditing ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            value={editCalendarName}
                            onChange={(e) => setEditCalendarName(e.target.value)}
                            className="input-field edit-input"
                            placeholder="Calendar name"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <>
                          <span className="calendar-name">{cal.name}</span>
                          <span className="calendar-owner">
                            {isOwner ? 'Owned by you' : `Created by: ${cal.owner}`}
                          </span>
                          {cal.member_count && (
                            <span className="member-count">
                              {cal.member_count} member{cal.member_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="calendar-actions">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleEditCalendar(cal.id)}
                            className="action-btn create-btn"
                            disabled={loading}
                          >
                            {loading ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="action-btn cancel-btn"
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <Link to={`/shared-calendar/${cal.id}`} className="action-btn view-btn">
                            View
                          </Link>
                          {isOwner && (
                            <button
                              onClick={() => startEditing(cal)}
                              className="action-btn edit-btn"
                              title="Edit Calendar Name"
                              disabled={loading}
                            >
                              Edit
                            </button>
                          )}
                          {isOwner ? (
                            <button
                              onClick={() => setConfirmDelete({ id: cal.id, name: cal.name })}
                              className="action-btn delete-btn"
                              title="Delete Calendar"
                              disabled={loading}
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLeaveCalendar(cal.id, cal.name)}
                              className="action-btn leave-btn"
                              title="Leave Calendar"
                              disabled={loading}
                            >
                              {loading ? 'Leaving...' : 'Leave'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
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
              {calendars.filter(cal => cal.owner === currentUser).map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
            <small className="help-text">You can only invite people to calendars you own</small>
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
            disabled={loading || !calendars.some(cal => cal.owner === currentUser)}
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