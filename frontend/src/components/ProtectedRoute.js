import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authenticateToken } from '../utilities/fetchApi';

// A simple function to check for the token
const auth = async () => {
  try {
    // Get the token from localStorage
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      return false;
    }

    // Verify the token by making an API call
    const response = await authenticateToken();
    
    return true; // If the API call is successful, the user is authenticated
  } catch (error) {
    return false;
  }
};

const ProtectedRoute = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the user is authenticated when the component mounts
    const checkAuth = async () => {
      const authStatus = await auth();
      setIsAuth(authStatus);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  console.log('ProtectedRoute isAuth:', isAuth);

  if (isLoading) {
    // You can render a loading spinner here for a better UX
    return <div>Loading...</div>; 
  }
  // If the user is authenticated, render the child route's component using <Outlet />.
  // If not, redirect them to the /login page.
  if (!isAuth) {
    localStorage.removeItem('authToken'); // Clear the token if not authenticated
    console.log('User is not authenticated, redirecting to login');
  }
  return isAuth ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;