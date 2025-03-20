import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ component: Component }) => {
    const accessToken = localStorage.getItem('access');

    // If there's no token, redirect to the login page
    if (!accessToken) {
        return <Navigate to="/login" />;
    }

    // If there's a token, render the component
    return <Component />;
};

export default PrivateRoute;
