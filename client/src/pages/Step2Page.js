import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Step2Page.css';

function Step2Page() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPerspective, setSelectedPerspective] = useState(null);
  
  // Get the perspectives from the route state
  const perspectives = location.state?.perspectives || [];

  // If no perspectives, redirect back to step 1
  if (perspectives.length === 0) {
    navigate('/');
    return null;
  }

  const handlePerspectiveClick = (perspective, index) => {
    setSelectedPerspective(index);
  };

  const handleContinue = () => {
    if (selectedPerspective !== null) {
      // Navigate to step 3 with the selected perspective and all perspectives
      navigate('/step3', { 
        state: { 
          perspective: perspectives[selectedPerspective],
          perspectives: perspectives 
        } 
      });
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="step2-container">
      <div className="step-header">
        <div className="step-indicator">
          <div className="step completed">1</div>
          <div className="step-label">Story Idea</div>
        </div>
        <div className="step-indicator">
          <div className="step active">2</div>
          <div className="step-label">Choose Perspective</div>
        </div>
      </div>

      <div className="content-container">
        <div className="perspectives-section">
          <h1>Choose a perspective for your story</h1>
          <p className="subtitle">Select one of these unique angles to explore your story idea.</p>
          
          <div className="perspectives-scroll">
            <div className="perspectives-carousel">
              {perspectives.map((perspective, index) => (
                <div 
                  key={index} 
                  className={`perspective-card ${selectedPerspective === index ? 'selected' : ''}`}
                  onClick={() => handlePerspectiveClick(perspective, index)}
                >
                  <div className="perspective-icon">
                    <i className={perspective.icon}></i>
                  </div>
                  <div className="perspective-content">
                    <div className="perspective-type">{perspective.type}</div>
                    <h3>{perspective.title}</h3>
                    <p>{perspective.preview}</p>
                  </div>
                  {selectedPerspective === index && (
                    <div className="selected-indicator">
                      <i className="fas fa-check"></i>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="navigation-buttons">
            <button className="back-button" onClick={handleGoBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <button 
              className="continue-button" 
              disabled={selectedPerspective === null}
              onClick={handleContinue}
            >
              Continue <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step2Page; 