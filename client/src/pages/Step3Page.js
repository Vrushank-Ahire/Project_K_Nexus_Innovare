import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Step3Page.css';

function Step3Page() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Move all useState hooks above any conditional logic
  // Parameters for story bible generation
  const [parameters, setParameters] = useState({
    genre: "fantasy",
    targetAudience: "young adult",
    toneAndMood: "dramatic",
    storyLength: "medium",
    complexity: 3,
    pacing: 3,
    worldBuildingDepth: 3,
    characterDevelopment: 3,
    themeEmphasis: 3
  });

  // Importance sliders
  const [importance, setImportance] = useState({
    charactersImportance: 3,
    plotImportance: 3,
    worldBuildingImportance: 3,
    themeImportance: 3,
    conflictImportance: 3
  });
  
  const selectedPerspective = location.state?.perspective;
  
  // If no perspective was selected, redirect back to step 2
  if (!selectedPerspective) {
    navigate('/step2');
    return null;
  }

  const handleParameterChange = (e) => {
    const { name, value } = e.target;
    setParameters({
      ...parameters,
      [name]: value
    });
  };

  const handleImportanceChange = (e) => {
    const { name, value } = e.target;
    setImportance({
      ...importance,
      [name]: parseInt(value)
    });
  };

  const handleGoBack = () => {
    navigate('/step2', { state: { perspectives: location.state?.perspectives } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Combine the selected perspective with the parameters
      const storyBibleRequest = {
        perspective: selectedPerspective,
        parameters: parameters,
        importance: importance
      };
      
      // Send the request to the backend
      const response = await fetch('http://localhost:5000/generate-story-bible', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyBibleRequest),
      });

      const data = await response.json();
      
      if (data.success) {
        // Navigate to step 4 with the story bible data
        navigate('/step4', { state: { storyBible: data.storyBible } });
      } else {
        alert(data.error || 'An unknown error occurred');
      }
    } catch (err) {
      alert('Failed to connect to the server');
      console.error(err);
    }
  };

  return (
    <div className="step3-container">
      <div className="step-header">
        <div className="step-indicator">
          <div className="step completed">1</div>
          <div className="step-label">Story Idea</div>
        </div>
        <div className="step-indicator">
          <div className="step completed">2</div>
          <div className="step-label">Choose Perspective</div>
        </div>
        <div className="step-indicator">
          <div className="step active">3</div>
          <div className="step-label">Customize Story</div>
        </div>
      </div>

      <div className="content-container">
        <div className="parameters-section">
          <h1>Customize Your Story</h1>
          <p className="subtitle">Fine-tune your story by adjusting these parameters.</p>
          
          <div className="selected-perspective">
            <h3>Selected Perspective:</h3>
            <div className="perspective-card-mini">
              <div className="perspective-icon">
                <i className={selectedPerspective.icon}></i>
              </div>
              <div className="perspective-content">
                <div className="perspective-type">{selectedPerspective.type}</div>
                <h3>{selectedPerspective.title}</h3>
                <p>{selectedPerspective.preview}</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="parameters-form">
            <div className="form-columns">
              <div className="form-column">
                <div className="form-group">
                  <label>Genre</label>
                  <select 
                    name="genre" 
                    value={parameters.genre}
                    onChange={handleParameterChange}
                  >
                    <option value="fantasy">Fantasy</option>
                    <option value="sci-fi">Science Fiction</option>
                    <option value="mystery">Mystery</option>
                    <option value="romance">Romance</option>
                    <option value="thriller">Thriller</option>
                    <option value="horror">Horror</option>
                    <option value="historical">Historical</option>
                    <option value="adventure">Adventure</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Target Audience</label>
                  <select 
                    name="targetAudience" 
                    value={parameters.targetAudience}
                    onChange={handleParameterChange}
                  >
                    <option value="children">Children</option>
                    <option value="middle-grade">Middle Grade</option>
                    <option value="young adult">Young Adult</option>
                    <option value="adult">Adult</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Tone & Mood</label>
                  <select 
                    name="toneAndMood" 
                    value={parameters.toneAndMood}
                    onChange={handleParameterChange}
                  >
                    <option value="lighthearted">Lighthearted</option>
                    <option value="dramatic">Dramatic</option>
                    <option value="dark">Dark</option>
                    <option value="humorous">Humorous</option>
                    <option value="suspenseful">Suspenseful</option>
                    <option value="whimsical">Whimsical</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Story Length</label>
                  <select 
                    name="storyLength" 
                    value={parameters.storyLength}
                    onChange={handleParameterChange}
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
              </div>
              
              <div className="form-column">
                <div className="form-group slider-group">
                  <label>Story Complexity (1-5)</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="complexity"
                      value={parameters.complexity}
                      onChange={handleParameterChange}
                    />
                    <span>{parameters.complexity}</span>
                  </div>
                </div>
                
                <div className="form-group slider-group">
                  <label>Pacing (1-5)</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="pacing"
                      value={parameters.pacing}
                      onChange={handleParameterChange}
                    />
                    <span>{parameters.pacing}</span>
                  </div>
                </div>
                
                <div className="form-group slider-group">
                  <label>World Building Depth (1-5)</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="worldBuildingDepth"
                      value={parameters.worldBuildingDepth}
                      onChange={handleParameterChange}
                    />
                    <span>{parameters.worldBuildingDepth}</span>
                  </div>
                </div>
                
                <div className="form-group slider-group">
                  <label>Character Development (1-5)</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="characterDevelopment"
                      value={parameters.characterDevelopment}
                      onChange={handleParameterChange}
                    />
                    <span>{parameters.characterDevelopment}</span>
                  </div>
                </div>
                
                <div className="form-group slider-group">
                  <label>Theme Emphasis (1-5)</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="themeEmphasis"
                      value={parameters.themeEmphasis}
                      onChange={handleParameterChange}
                    />
                    <span>{parameters.themeEmphasis}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="importance-section">
              <h3>Element Importance</h3>
              <p>Set the relative importance of each story element:</p>
              
              <div className="importance-sliders">
                <div className="importance-slider">
                  <label>Characters</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="charactersImportance"
                      value={importance.charactersImportance}
                      onChange={handleImportanceChange}
                    />
                    <span>{importance.charactersImportance}</span>
                  </div>
                </div>
                
                <div className="importance-slider">
                  <label>Plot</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="plotImportance"
                      value={importance.plotImportance}
                      onChange={handleImportanceChange}
                    />
                    <span>{importance.plotImportance}</span>
                  </div>
                </div>
                
                <div className="importance-slider">
                  <label>World Building</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="worldBuildingImportance"
                      value={importance.worldBuildingImportance}
                      onChange={handleImportanceChange}
                    />
                    <span>{importance.worldBuildingImportance}</span>
                  </div>
                </div>
                
                <div className="importance-slider">
                  <label>Theme</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="themeImportance"
                      value={importance.themeImportance}
                      onChange={handleImportanceChange}
                    />
                    <span>{importance.themeImportance}</span>
                  </div>
                </div>
                
                <div className="importance-slider">
                  <label>Conflict</label>
                  <div className="slider-with-value">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      name="conflictImportance"
                      value={importance.conflictImportance}
                      onChange={handleImportanceChange}
                    />
                    <span>{importance.conflictImportance}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="navigation-buttons">
              <button type="button" className="back-button" onClick={handleGoBack}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <button type="submit" className="continue-button">
                Generate Story Bible <i className="fas fa-book"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Step3Page; 