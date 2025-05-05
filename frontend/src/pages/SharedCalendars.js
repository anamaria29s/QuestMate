import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SharedCalendars = () => {
  const [calendars, setCalendars] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [calendarName, setCalendarName] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [selectedCalendarId, setSelectedCalendarId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [receiverId, setReceiverId] = useState(null);

  useEffect(() => {
    fetchCalendars();
    fetchFriends();
  }, []);

  const fetchCalendars = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await axios.get('http://127.0.0.1:8000/api/shared-calendars/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCalendars(response.data.calendars || []);
      setPendingInvites(response.data.pending_invites || []);
    } catch (error) {
      console.error('Error fetching shared calendars:', error);
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
    const token = localStorage.getItem("access");
    if (!token) return;
    try {
      await axios.post('http://127.0.0.1:8000/api/shared-calendars/create/', {
        name: calendarName,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      setCalendarName('');
      fetchCalendars();
    } catch (error) {
      console.error('Error creating calendar:', error);
    }
  };

  const handleInvite = async () => {

    console.log("Selected Calendar ID:", selectedCalendarId);
    console.log("Receiver ID:", receiverId);

    if (!selectedCalendarId || !receiverId) {
      console.error("Missing calendar ID or receiver ID");
      return;
    }
    try {
      console.log("Sending invite with:", { selectedCalendarId, receiverId });
  
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
      fetchCalendars();
    } catch (error) {
      console.error('Error sending invite:', error);
      if (error.response) {
        console.log("Response error:", error.response.data);
      }
    }
  };
  

  const handleAccept = async (membershipId) => {
    try {
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
    }
  };

  const handleDecline = async (membershipId) => {
    try {
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
      console.log(filtered);  // Debugging to check the filtered list
      setFilteredFriends(filtered);
    }
  };
  

  const handleSelectFriend = (friend) => {
    console.log("Selected Friend:", friend);  // Debugging
    setInviteUsername(friend.username);  // Set the username
    setReceiverId(friend.id);            // Set the receiverId to the friend's ID
    setFilteredFriends([]);              // Clear the filtered list
  };
  

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Shared Calendars</h2>

      {/* Existing Calendars */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Your Calendars</h3>
        <ul className="list-disc ml-6">
          {calendars.length > 0 ? (
            calendars.map((cal) => (
              <li key={cal.id}>
                <span className="font-medium">{cal.name}</span>
                <span className="text-sm text-gray-500 ml-2">(Created by: {cal.owner})</span>
                <Link to={`/shared-calendar/${cal.id}`} className="text-blue-500 ml-2">View</Link>
              </li>
            ))
          ) : (
            <li>No calendars available.</li>
          )}
        </ul>
      </div>

      {/* Create New Calendar */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Create New Calendar</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Calendar Name"
            value={calendarName}
            onChange={(e) => setCalendarName(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <button
            onClick={handleCreateCalendar}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create
          </button>
        </div>
      </div>

      {/* Invite User */}
      <div className="mb-6 relative">
        <h3 className="text-xl font-semibold mb-2">Invite to Calendar</h3>
        <div className="flex flex-col gap-2">
          <select
            value={selectedCalendarId || ''}
            onChange={(e) => setSelectedCalendarId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select a calendar</option>
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Friend's Username"
            value={inviteUsername}
            onChange={handleUsernameChange}
            className="border p-2 rounded"
          />
          {filteredFriends.length > 0 && (
            <ul className="absolute z-10 bg-white border rounded shadow w-full mt-1 max-h-40 overflow-y-auto">
              {filteredFriends.map((friend) => (
                <li
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend)} 
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {friend.username}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleInvite}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Send Invite
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Pending Invitations</h3>
          <ul className="list-disc ml-6">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="mb-2">
                <span>{invite.calendar.name} (from {invite.calendar.owner})</span>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleAccept(invite.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(invite.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
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
  );
};

export default SharedCalendars;
