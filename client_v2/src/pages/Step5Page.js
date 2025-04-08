import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Step5Page.css';
import ReactMarkdown from 'react-markdown';

const Step5Page = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { storyBible } = location.state || {};
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!storyBible) {
      navigate('/step4');
      return;
    }
    generateInitialEpisode();
  }, [storyBible, navigate]);

  const generateInitialEpisode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:5000/generate_episode', {
        storyBible,
        episodeNumber: 1,
        previousEpisodes: [],
      });

      const initialEpisode = {
        number: 1,
        title: response.data.title || 'Episode 1',
        content: response.data.content || 'No content available.',
      };

      setEpisodes([initialEpisode]);
      setSelectedEpisode(initialEpisode);
    } catch (error) {
      console.error('Error generating initial episode:', error);
      setError('Failed to generate the initial episode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateNextEpisode = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextEpisodeNumber = episodes.length + 1;
      const response = await axios.post('http://localhost:5000/generate_episode', {
        storyBible,
        episodeNumber: nextEpisodeNumber,
        previousEpisodes: episodes,
      });

      const newEpisode = {
        number: nextEpisodeNumber,
        title: response.data.title || `Episode ${nextEpisodeNumber}`,
        content: response.data.content || 'No content available.',
      };

      setEpisodes([...episodes, newEpisode]);
      setSelectedEpisode(newEpisode);
    } catch (error) {
      console.error('Error generating next episode:', error);
      setError('Failed to generate the next episode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadEpisode = async () => {
    if (!selectedEpisode) return;
    setIsDownloading(true);
    setError(null);
    try {
      const response = await axios.post(
        'http://localhost:5000/generate-episode-pdf',
        {
          title: selectedEpisode.title,
          content: selectedEpisode.content,
          storyTitle: storyBible.title,
          episodeNumber: selectedEpisode.number,
        },
        { 
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf',
            'Content-Type': 'application/json'
          }
        }
      );

      // Check if the response is actually a PDF
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        // If it's JSON, it's probably an error message
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const error = JSON.parse(reader.result);
            setError(error.error || 'Failed to generate PDF');
          } catch (e) {
            setError('Failed to generate PDF');
          }
        };
        reader.readAsText(response.data);
        return;
      }

      if (!contentType || !contentType.includes('application/pdf')) {
        setError('Invalid response format from server');
        return;
      }

      // Create download link
      const filename = `${storyBible.title.replace(/\s+/g, '_')}_Episode_${selectedEpisode.number}_${selectedEpisode.title.replace(/\s+/g, '_')}.pdf`;
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // For IE
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        // For other browsers
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error('Error downloading episode:', error);
      if (error.response) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            setError(errorData.error || 'Failed to download the episode. Please try again.');
          } catch (e) {
            setError('Failed to download the episode. Please try again.');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        setError('Failed to download the episode. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNextEpisode = () => {
    const currentIndex = episodes.findIndex(ep => ep.number === selectedEpisode.number);
    if (currentIndex < episodes.length - 1) {
      setSelectedEpisode(episodes[currentIndex + 1]);
    } else {
      generateNextEpisode();
    }
  };

  return (
    <div className="step5-container">
      <div className="step-header">
        <div className="step-indicator">
          <div className="step completed">1</div>
          <span className="step-label">IDEA</span>
        </div>
        <div className="step-indicator">
          <div className="step completed">2</div>
          <span className="step-label">PERSPECTIVES</span>
        </div>
        <div className="step-indicator">
          <div className="step completed">3</div>
          <span className="step-label">FLASH CARDS</span>
        </div>
        <div className="step-indicator">
          <div className="step completed">4</div>
          <span className="step-label">STORY BIBLE</span>
        </div>
        <div className="step-indicator">
          <div className="step active">5</div>
          <span className="step-label">EPISODES</span>
        </div>
      </div>

      <div className="story-title-container">
        <h1>{storyBible?.title || 'Untitled Story'}</h1>
        <p className="tagline">{storyBible?.tagline || 'A story unfolds...'}</p>
      </div>

      <div className="content-container">
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        
        <div className="episodes-content">
          <div className="episode-list">
            <h3>Episodes</h3>
            {episodes.map(episode => (
              <div
                key={episode.number}
                className={`episode-item ${selectedEpisode?.number === episode.number ? 'active' : ''}`}
                onClick={() => setSelectedEpisode(episode)}
              >
                <h4>Episode {episode.number}</h4>
                <p>{episode.title}</p>
              </div>
            ))}
          </div>

          <div className="episode-content">
            {loading ? (
              <div className="generate-episode-panel">
                <h3>Generating Episode...</h3>
                <div className="loading-spinner"></div>
              </div>
            ) : selectedEpisode ? (
              <>
                <h3>{selectedEpisode.title}</h3>
                <div className="reading-content">
                  <ReactMarkdown>{selectedEpisode.content}</ReactMarkdown>
                </div>
                <div className="navigation-buttons">
                  <button className="back-button" onClick={() => navigate('/step4', { state: { storyBible } })}>
                    <i className="fas fa-arrow-left"></i> Back to Story Bible
                  </button>
                  <div>
                    <button 
                      className="download-episode-button" 
                      onClick={downloadEpisode}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <>
                          <div className="loading-spinner"></div> Downloading...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-download"></i> Download Episode
                        </>
                      )}
                    </button>
                    <button className="next-episode-button" onClick={handleNextEpisode}>
                      Next Episode <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="generate-episode-panel">
                <h3>Generate Your First Episode</h3>
                <p>Start your story by generating the first episode.</p>
                <button className="generate-button" onClick={generateInitialEpisode}>
                  <i className="fas fa-magic"></i> Generate Episode
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step5Page;