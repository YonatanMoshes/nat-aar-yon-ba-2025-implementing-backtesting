import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import Homepage from './pages/Homepage/homepage';
import LoginForm from './pages/Forms/LogInForm';
import SignUpForm from './pages/Forms/SignUpForm';
import InteractiveGraph from './pages/InteactiveGraph/InteractiveGraph';
import InvestingPage from './pages/InvestingPage/InvestingPage';
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketProvider } from './utilities/SocketContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/" element={<Homepage />} />
          <Route path="/signup" element={<SignUpForm />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/interactive-graph" element={<InteractiveGraph />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/invest" element={<InvestingPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
