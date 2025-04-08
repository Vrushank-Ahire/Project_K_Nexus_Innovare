import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Step1Page from './pages/Step1Page';
import Step2Page from './pages/Step2Page';
import Step3Page from './pages/Step3Page';
import Step4Page from './pages/Step4Page';
import Step5Page from './pages/Step5Page';
import './App.css';

const bgImages = [
  "https://images-na.ssl-images-amazon.com/images/P/0062315005.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0446310786.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0451524934.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0743273567.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/059035342X.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/054792822X.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0141439513.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0316769487.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0618640150.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0143107631.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0141439556.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0143035002.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0060934344.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0374528373.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1503280780.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1400079985.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0140268863.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0140275363.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0142437220.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0140424385.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0679722769.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0393964817.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0679723161.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0060850523.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0143039431.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0060883286.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0743297334.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0679732764.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1400033411.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/038549081X.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0735211299.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0062316095.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0062457713.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0374533555.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1577314808.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0807014273.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0743269519.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1599869772.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0060731338.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0553380168.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0199291152.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0345539435.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/147673352X.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1476708703.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0143037889.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0553577123.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0316548189.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1451648537.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/006230125X.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1524763136.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1612680194.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0307887898.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0066620996.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0804139296.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0060555661.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/1878424319.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/055338371X.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/081298160X.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0307352153.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0345472322.01.LZZZZZZZ.jpg",
  "https://images-na.ssl-images-amazon.com/images/P/0140449337.01.LZZZZZZZ.jpg"
];

// Duplicate images for longer strips (e.g., 4 times) 

const stripImages = [...bgImages, ...bgImages, ...bgImages, ...bgImages]; 

// Config
const NUM_ROWS = 3;
const BOOKS_PER_ROW = stripImages.length; // Use all duplicated images per row

// Helper function for random positioning/sizing
const getRandomStyle = (index) => {
  const size = 15 + Math.random() * 15; // Size between 15vmax and 30vmax
  return {
    backgroundImage: `url('${bgImages[index]}')`,
    width: `${size * 0.7}vmax`, // Maintain aspect ratio roughly
    height: `${size}vmax`,
    top: `${Math.random() * 80}%`, // Random top (0-80%)
    left: `${Math.random() * 80}%`, // Random left (0-80%)
    animationDelay: `-${Math.random() * 30}s`, // Random delay up to 30s
    transform: `rotate(${Math.random() * 20 - 10}deg)` // Initial small rotation
  };
}

function App() {
  return (
    <Router>
      <div className="App">
        {/* Film Strip Background */}
        <div className="film-strip-background">
          {[...Array(NUM_ROWS)].map((_, rowIndex) => (
            <div key={rowIndex} className={`film-strip strip-${rowIndex + 1}`}>
              {stripImages.map((url, bookIndex) => (
                <div 
                  key={`${rowIndex}-${bookIndex}`}
                  className="film-tile"
                  style={{ backgroundImage: `url('${url}')` }}
                ></div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Remove old floating books container */}
        {/* 
        <div className="floating-books-container">
          {bgImages.map((url, index) => (...))}
        </div> 
        */}

        <header className="App-header">
          <div className="header-content">
            <h1>StoryForge</h1>
            {/* Remove Header Actions and Sign In Button */}
            {/* 
            <div className="header-actions">
              <button className="btn btn-signin">Sign In</button>
            </div> 
            */}
          </div>
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
          <p>StoryForge &copy; 2025 - All rights reserved</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
