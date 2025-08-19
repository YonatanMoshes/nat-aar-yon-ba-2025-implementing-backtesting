// src/context/SocketContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';

// 1. Define the connection details for each service
const socketConfigs = {
  model: {
    path: "/api/py/model/socket.io/",
  },
  recommendation: {
    path: "/api/py/recommendation/socket.io/",
  }
};

// 2. Create the context object
const SocketContext = createContext();

// 3. Create the custom hook for easy access
export function useSockets() { // Renamed to useSockets (plural) for clarity
  return useContext(SocketContext);
}

// 4. Create the expanded Provider component
export function SocketProvider({ children }) {
  // Use state to hold an object of sockets and their connection statuses
  const [sockets, setSockets] = useState({});
  const [connectionStatus, setConnectionStatus] = useState({});

  useEffect(() => {
    // This effect runs only ONCE when the app loads
    const newSockets = {};
    
    // Loop through our configs and create a socket for each service
    Object.entries(socketConfigs).forEach(([name, config]) => {
      const socket = io(window.location.origin, config);
      newSockets[name] = socket;

      // Set up listeners for each socket individually
      socket.on('connect', () => {
        console.log(`Socket '${name}' connected! ID: ${socket.id}`);
        setConnectionStatus(prevStatus => ({
          ...prevStatus,
          [name]: { isConnected: true, sid: socket.id }
        }));
      });
      
      socket.on('disconnect', () => {
        console.log(`Socket '${name}' disconnected.`);
        setConnectionStatus(prevStatus => ({
          ...prevStatus,
          [name]: { isConnected: false, sid: null }
        }));
      });
    });

    setSockets(newSockets);

    // Cleanup function to close all connections when the app unmounts
    return () => {
      console.log("Closing all socket connections.");
      Object.values(newSockets).forEach(socket => socket.close());
    };
  }, []); // Empty dependency array is crucial!

  // Provide an object containing both sockets and their statuses
  const value = {
    sockets,
    connectionStatus,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}