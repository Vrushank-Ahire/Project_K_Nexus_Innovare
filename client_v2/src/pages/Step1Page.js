import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Step1Page.css';

// Updated list of background images
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

const EXAMPLE_PROMPTS = [
  "Create a thrilling mystery story set in a futuristic city",
  "Write a heartwarming tale about friendship and adventure",
  "Craft a fantasy story with magical creatures and epic battles",
  "Develop a sci-fi narrative about space exploration and discovery"
];

// Duplicate images for longer strips - Use the new bgImages array
const stripImages = [...bgImages, ...bgImages, ...bgImages, ...bgImages];

// Config
const NUM_ROWS = 3;

// Remove old helper function if not needed elsewhere
/*
const getRandomStyle = ...
*/

const Step1Page = () => {
  const navigate = useNavigate();
  const [storyData, setStoryData] = useState({ prompt: '' });
  const [charCount, setCharCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePromptChange = (e) => {
    const text = e.target.value;
    setStoryData({ prompt: text });
    setCharCount(text.length);
    if (error) setError('');
  };

  const handleExampleClick = (prompt) => {
    setStoryData({ prompt });
    setCharCount(prompt.length);
    if (error) setError('');
  };

  const handleNext = async () => {
    if (!storyData.prompt.trim().length) {
      setError('Please enter a story prompt or select an example.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await axios.post(
        'http://localhost:5000/generate',
        {
          query: storyData.prompt
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        navigate('/step2', { 
          state: { 
            perspectives: response.data.perspectives,
            prompt: storyData.prompt
          }
        });
      } else {
        setError(response.data.error || 'Failed to generate perspectives');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.message || 'Failed to connect to the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="step1-container" id="step1">
      <div className="step-header">
        <h2 className="word-reveal">
          Powered by <span className="text-highlight-red">AI</span> 
          • 
          Driven by <span className="text-highlight-red">You</span>
        </h2>
        {/* <p className="header-subtitle">Powered by AI. Driven by You.</p> */}
      </div>
      <div className="prompt-container">
        <textarea
          className="prompt-textarea"
          id="storyPrompt"
          placeholder="Describe the story you want to create. E.g., 'A lone astronaut exploring a nebula discovers an ancient alien signal.'"
          value={storyData.prompt}
          onChange={handlePromptChange}
          maxLength="500"
        />
        <div className="char-counter">Fuel level: <span id="charCount">{500 - charCount}</span> chars</div>
        {error && <div className="error-message">{error}</div>}
      </div>
      <div className="example-prompts">
        {EXAMPLE_PROMPTS.map((prompt, index) => (
          <button 
            key={index}
            className="example-prompt"
            onClick={() => handleExampleClick(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
      <div className="btn-container">
        <button
          className="generate-button"
          id="nextToStep2"
          onClick={handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Generating...' : 'Generate Perspectives'}
        </button>
      </div>
    </div>
  );
};

export default Step1Page; 