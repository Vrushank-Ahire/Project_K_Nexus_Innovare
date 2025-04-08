import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Step2Page.css';

function Step2Page() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPerspective, setSelectedPerspective] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  
  // Get the perspectives from the route state
  const perspectives = location.state?.perspectives || [];

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const cardWidth = 500;
        const gap = 4;
        const padding = 250; // Half of the card width
        const newIndex = Math.round((scrollLeft - padding) / (cardWidth + gap));
        setCurrentIndex(newIndex);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handlePerspectiveClick = (perspective, index) => {
    if (scrollContainerRef.current) {
      const cardWidth = 500;
      const gap = 4;
      const padding = 250; // Half of the card width
      const targetPosition = index * (cardWidth + gap) + padding;
      scrollContainerRef.current.scrollTo({
        left: targetPosition,
        behavior: 'smooth'
      });
    }
    setSelectedPerspective(index);
  };

  const handleContinue = () => {
    if (selectedPerspective !== null) {
      navigate('/step3', {
        state: {
          perspective: perspectives[selectedPerspective],
          perspectives: perspectives,
          originalQuery: location.state?.prompt || ''
        }
      });
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  // Move the conditional return after all hooks
  if (perspectives.length === 0) {
    navigate('/');
    return null;
  }

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
          <p className="subtitle">Select the perspective that best matches your viewpoint</p>
          
          <div className="perspectives-scroll" ref={scrollContainerRef}>
            <div className="perspectives-carousel">
              {perspectives.map((perspective, index) => {
                const isCenter = index === currentIndex;
                const isSelected = selectedPerspective === index;
                
                return (
                  <div
                    key={`${index}-${perspective.id || index}`}
                    className={`perspective-card ${isCenter ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handlePerspectiveClick(perspective, index)}
                  >
                    <div className="perspective-content">
                      <div className="perspective-type">
                        <i className={perspective.icon}></i>
                        <span>{perspective.type}</span>
                      </div>
                      <h3>{perspective.title}</h3>
                      <p>{perspective.preview}</p>
                    </div>
                    {isSelected && (
                      <div className="selected-indicator">
                        <i className="fas fa-check"></i>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="navigation-buttons">
            <button className="back-button" onClick={handleGoBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <button
              className="continue-button"
              onClick={handleContinue}
              disabled={selectedPerspective === null}
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