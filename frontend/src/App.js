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

function App() {
    return (
        <Router>
            <div className="App">
                <Header />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/calendar" element={<PrivateRoute component={CalendarPage} />} />
                    <Route path="/" element={<Navigate to="/calendar" />} />
                    <Route path="/profile/:username" element={<Profile />} />
                    <Route path="/profile/:username/update" element={<UpdateProfile />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
