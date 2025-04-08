import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Step3Page.css';

function Step3Page() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const [parameters, setParameters] = useState({
    genre: "fantasy",
    targetAudience: "young adult",
    toneAndMood: "dramatic",
    storyLength: "medium",
    complexity: 3,
    pacing: 3,
    worldBuildingDepth: 3,
    characterDevelopment: 3
  });
  
  const selectedPerspective = location.state?.perspective;
  
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

  const handleGoBack = () => {
    navigate('/step2', { state: { perspectives: location.state?.perspectives } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      // Get the original query from location state
      const originalQuery = location.state?.originalQuery || '';
      
      // Get the full perspective object from location state
      const perspective = location.state?.perspective;
      
      if (!perspective) {
        setError('No perspective selected');
        setIsGenerating(false);
        return;
      }

      const storyBibleRequest = {
        prompt: originalQuery,
        perspective: perspective,
        parameters: {
          genre: parameters.genre,
          targetAudience: parameters.targetAudience,
          toneAndMood: parameters.toneAndMood,
          storyLength: parameters.storyLength,
          complexity: parameters.complexity,
          pacing: parameters.pacing,
          worldBuildingDepth: parameters.worldBuildingDepth,
          characterDevelopment: parameters.characterDevelopment
        }
      };

      const response = await fetch('http://localhost:5000/generate-story-bible', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyBibleRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        navigate('/step4', { 
          state: { 
            storyBible: data.storyBible,
            perspective: perspective,
            originalQuery: originalQuery
          } 
        });
      } else {
        setError(data.error || 'An unknown error occurred');
      }
    } catch (err) {
      setError('Failed to connect to the server: ' + err.message);
      console.error(err);
    } finally {
      setIsGenerating(false);
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
              </div>
            </div>

            <div className="navigation-buttons">
              <button type="button" className="back-button" onClick={handleGoBack}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <button type="submit" className="continue-button">
                Continue <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Step3Page; 