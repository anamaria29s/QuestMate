import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home'; 
import CalendarPage from './pages/Calendar';
import PrivateRoute from './pages/PrivateRoute';
import Profile from './pages/Profile';
import UpdateProfile from './pages/UpdateProfile';
import Header from './Header';
import './App.css'; 
import SharedCalendars from './pages/SharedCalendars';
import SharedCalendarPage from './pages/SharedCalendarPage';
import AuthCheck from './AuthCheck';
import { NotificationProvider } from './pages/NotificationContext';

function App() {
    return (
        <NotificationProvider>
            <Router>
                <div className="App">
                    <Header />
                    <Routes>
                        {/* Public Home Route - accessible without authentication */}
                        <Route path="/" element={<Home />} />
                        <Route path="/home" element={<Home />} />
                        
                        {/* Authentication Routes */}
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/login" element={<Login />} />
                        
                        {/* Protected Routes */}
                        <Route path="/calendar" element={<PrivateRoute component={CalendarPage} />} />
                        <Route path="/profile/:username" element={<PrivateRoute component={Profile} />} />
                        <Route path="/profile/:username/update" element={<PrivateRoute component={UpdateProfile} />} />
                        <Route path="/sharedcalendars" element={<PrivateRoute component={SharedCalendars} />} />
                        <Route path="/shared-calendar/:id" element={<PrivateRoute component={SharedCalendarPage} />} />
                        
                        {/* Catch all route - redirect to home */}
                        <Route path="*" element={<Navigate to="/home" replace />} />
                    </Routes>
                </div>
            </Router>
        </NotificationProvider>
    );
}

export default App;