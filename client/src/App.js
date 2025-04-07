import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Step1Page from './pages/Step1Page';
import Step2Page from './pages/Step2Page';
import Step3Page from './pages/Step3Page';
import Step4Page from './pages/Step4Page';
import Step5Page from './pages/Step5Page';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>StoryForge</h1>
          <p>AI-Powered Story Generation Assistant</p>
        </header>
        
        <main className="App-main">
          <Routes>
            <Route path="/" element={<Step1Page />} />
            <Route path="/step2" element={<Step2Page />} />
            <Route path="/step3" element={<Step3Page />} />
            <Route path="/step4" element={<Step4Page />} />
            <Route path="/step5" element={<Step5Page />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        
        <footer className="App-footer">
          <p>StoryForge &copy; 2023 - All rights reserved</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
