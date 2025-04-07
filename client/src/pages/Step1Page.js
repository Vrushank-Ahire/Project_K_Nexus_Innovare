import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Step1Page.css';

function Step1Page() {
  const [storyPrompt, setStoryPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!storyPrompt.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: storyPrompt }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Navigate to step 2 with the perspectives data
        navigate('/step2', { state: { perspectives: data.perspectives } });
      } else {
        setError(data.error || 'An unknown error occurred');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to connect to the server');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="step1-container">
      <div className="step-header">
        <div className="step-indicator">
          <div className="step active">1</div>
          <div className="step-label">Story Idea</div>
        </div>
        <div className="step-indicator">
          <div className="step">2</div>
          <div className="step-label">Choose Perspective</div>
        </div>
      </div>

      <div className="content-container">
        <div className="prompt-section">
          <h1>Tell me your story idea</h1>
          <p className="subtitle">Let your imagination run wild – describe the essence of your story in a few sentences.</p>
          
          <form onSubmit={handleSubmit} className="prompt-form">
            <textarea
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              placeholder="I want to write a story about..."
              rows={6}
              className="prompt-textarea"
            />
            
            {error && <div className="error-message">{error}</div>}
            
            <button 
              type="submit" 
              className="generate-button"
              disabled={loading || !storyPrompt.trim()}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Generating...
                </>
              ) : (
                'Generate Perspectives'
              )}
            </button>
          </form>
        </div>
        
        <div className="inspiration-section">
          <h2>Need inspiration?</h2>
          <div className="inspiration-cards">
            <div className="inspiration-card">
              <h3>A hero's journey</h3>
              <p>An ordinary person is called to adventure and must face extraordinary challenges.</p>
            </div>
            <div className="inspiration-card">
              <h3>Star-crossed lovers</h3>
              <p>Two people fall in love despite obstacles that threaten to keep them apart.</p>
            </div>
            <div className="inspiration-card">
              <h3>Mystery to solve</h3>
              <p>A detective or amateur sleuth must solve a puzzling crime or mystery.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step1Page; 