import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudentPage from './StudentPage';
import WaitingPage from './WaitingPage';
import ProfPage from './ProfPage';
import LoginPage from './LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/student" element={<StudentPage />} />
        <Route path="/waiting" element={<WaitingPage onExit={() => {}} connected={false} />} />
        <Route path="/prof" element={<ProfPage onExit={() => {}} connected={false} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;