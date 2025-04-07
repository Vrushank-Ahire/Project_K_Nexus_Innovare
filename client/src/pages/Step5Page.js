import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import '../styles/Step5Page.css';

function Step5Page() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [storyBible, setStoryBible] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeContent, setEpisodeContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const episodeContentRef = useRef(null);

  useEffect(() => {
    // Check if we have the story bible data
    if (location.state?.storyBible) {
      setStoryBible(location.state.storyBible);
    } else {
      // Redirect to step 1 if no data
      navigate('/');
    }
  }, [location, navigate]);

  const handleGoBack = () => {
    navigate('/step4', { 
      state: { 
        storyBible: storyBible,
        perspective: location.state?.perspective,
        perspectives: location.state?.perspectives
      } 
    });
  };

  const generateEpisode = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log("Generating episode with data:", {
        storyBible: storyBible,
        episodeNumber: currentEpisode,
        previousEpisodes: episodes
      });
      
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          storyBible: storyBible,
          episodeNumber: currentEpisode,
          previousEpisodes: episodes
        }),
      };
      
      console.log("Sending request to: http://127.0.0.1:5000/generate_episode");
      
      const response = await fetch('http://127.0.0.1:5000/generate_episode', requestOptions);
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response error:", errorText);
        throw new Error(`Failed to generate episode: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Received episode data:", data);
      
      // Add the new episode to the episodes list
      const newEpisode = {
        number: currentEpisode,
        title: data.title || `Episode ${currentEpisode}`,
        content: data.content || "No content generated. Please try again.",
        scenes: data.scenes || []
      };
      
      setEpisodeTitle(newEpisode.title);
      setEpisodeContent(newEpisode.content);
      setEpisodes([...episodes, newEpisode]);
      
    } catch (error) {
      console.error('Error generating episode:', error);
      setError(`Failed to generate episode: ${error.message}. Please ensure the server is running at http://127.0.0.1:5000/`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextEpisode = () => {
    // Save current episode and increment counter
    setCurrentEpisode(currentEpisode + 1);
    setEpisodeTitle('');
    setEpisodeContent('');
  };

  const handleSelectEpisode = (episodeIndex) => {
    const selectedEpisode = episodes[episodeIndex];
    setCurrentEpisode(selectedEpisode.number);
    setEpisodeTitle(selectedEpisode.title);
    setEpisodeContent(selectedEpisode.content);
  };

  const downloadEpisodePDF = async () => {
    if (!episodeContentRef.current || !episodeTitle) return;
    
    setIsDownloading(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const title = episodeTitle || `Episode ${currentEpisode}`;
      
      // PDF configuration
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pdfWidth - (margin * 2);
      
      // Add title page with enhanced styling
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      
      // Add decorative element
      pdf.setDrawColor(76, 175, 80);
      pdf.setLineWidth(1.5);
      pdf.line(margin, 30, pdfWidth - margin, 30);
      pdf.line(margin, pdfHeight - 30, pdfWidth - margin, pdfHeight - 30);
      
      pdf.setFontSize(24);
      pdf.setTextColor(60, 60, 60);
      pdf.text(storyBible.title, pdfWidth / 2, 50, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Episode ${currentEpisode}: ${title}`, pdfWidth / 2, 70, { align: 'center' });
      
      if (storyBible.tagline) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(storyBible.tagline, pdfWidth / 2, 85, { align: 'center' });
      }
      
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      const date = new Date().toLocaleDateString();
      pdf.text(`Generated on ${date}`, pdfWidth / 2, pdfHeight - 40, { align: 'center' });
      
      pdf.addPage();
      
      // Add episode title
      pdf.setFontSize(18);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`Episode ${currentEpisode}: ${title}`, margin, margin + 10);
      
      // Add horizontal line after title
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, margin + 15, pdfWidth - margin, margin + 15);
      
      // Add episode content with improved formatting
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      
      // Process content into proper paragraphs
      const paragraphs = episodeContent.split('\n\n');
      let y = margin + 25;
      let currentPage = 2;
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') continue;
        
        // Check if this is a dialogue line (starts with a character name and colon)
        const isDialogue = /^[A-Za-z\s]+\s*:\s*"/.test(paragraph);
        
        // Format text differently based on content type
        if (isDialogue) {
          pdf.setFont('helvetica', 'italic');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        const splitText = pdf.splitTextToSize(paragraph, maxWidth);
        
        // Check if we need a new page
        if (y + (splitText.length * 6) > pdfHeight - margin) {
          pdf.addPage();
          currentPage++;
          
          // Add page number
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${currentPage}`, pdfWidth - margin, pdfHeight - 10);
          
          y = margin;
        }
        
        pdf.text(splitText, margin, y);
        y += (splitText.length * 6) + 8; // Increased spacing between paragraphs
      }
      
      // Add page numbers to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        if (i > 1) { // Skip the title page
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${i} of ${totalPages}`, pdfWidth - margin, pdfHeight - 10);
        }
      }
      
      // Save the PDF
      const safeTitleForFilename = title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
      pdf.save(`${storyBible.title.replace(/\s+/g, '_')}_Episode_${currentEpisode}_${safeTitleForFilename}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAllEpisodesPDF = async () => {
    if (episodes.length === 0) {
      alert('No episodes to download. Generate at least one episode first.');
      return;
    }
    
    setIsDownloading(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // PDF configuration
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pdfWidth - (margin * 2);
      
      // Add enhanced title page
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      
      // Add decorative elements
      pdf.setDrawColor(255, 152, 0); // Orange for the all-episodes version
      pdf.setLineWidth(1.5);
      pdf.line(margin, 30, pdfWidth - margin, 30);
      pdf.line(margin, pdfHeight - 30, pdfWidth - margin, pdfHeight - 30);
      
      pdf.setFontSize(28);
      pdf.setTextColor(60, 60, 60);
      pdf.text(storyBible.title, pdfWidth / 2, 50, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Complete Story", pdfWidth / 2, 70, { align: 'center' });
      
      if (storyBible.tagline) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(storyBible.tagline, pdfWidth / 2, 85, { align: 'center' });
      }
      
      pdf.setFontSize(14);
      pdf.setTextColor(90, 90, 90);
      pdf.text(`${episodes.length} Episodes`, pdfWidth / 2, 100, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      const date = new Date().toLocaleDateString();
      pdf.text(`Generated on ${date}`, pdfWidth / 2, pdfHeight - 40, { align: 'center' });
      
      // Add table of contents
      pdf.addPage();
      pdf.setFontSize(20);
      pdf.setTextColor(60, 60, 60);
      pdf.text("Table of Contents", pdfWidth / 2, margin, { align: 'center' });
      
      // Add decorative line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, margin + 5, pdfWidth - margin, margin + 5);
      
      let tocY = margin + 15;
      episodes.forEach((episode, index) => {
        pdf.setFontSize(12);
        pdf.text(`Episode ${episode.number}: ${episode.title}`, margin, tocY);
        
        // Add dots between title and page number
        pdf.setFontSize(10);
        pdf.setTextColor(120, 120, 120);
        
        // Calculate the page number for this episode (title page + TOC page + previous episodes)
        const episodePage = 2 + index + 1; // +1 for title page, +1 for TOC
        pdf.text(`Page ${episodePage}`, pdfWidth - margin, tocY, { align: 'right' });
        
        tocY += 8;
      });
      
      // Add page number to TOC
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Page 2 of ${2 + episodes.length}`, pdfWidth - margin, pdfHeight - 10);
      
      // Add each episode
      let currentPage = 2;
      for (const episode of episodes) {
        pdf.addPage();
        currentPage++;
        
        // Add episode title with styling
        pdf.setFontSize(18);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Episode ${episode.number}: ${episode.title}`, margin, margin + 10);
        
        // Add horizontal line
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(margin, margin + 15, pdfWidth - margin, margin + 15);
        
        // Add episode content
        pdf.setFontSize(11);
        pdf.setTextColor(80, 80, 80);
        
        // Split the content into paragraphs and add them to the PDF
        const paragraphs = episode.content.split('\n\n');
        let y = margin + 25;
        
        for (const paragraph of paragraphs) {
          if (paragraph.trim() === '') continue;
          
          // Check if this is a dialogue line
          const isDialogue = /^[A-Za-z\s]+\s*:\s*"/.test(paragraph);
          
          // Format text differently based on content type
          if (isDialogue) {
            pdf.setFont('helvetica', 'italic');
          } else {
            pdf.setFont('helvetica', 'normal');
          }
          
          const splitText = pdf.splitTextToSize(paragraph, maxWidth);
          
          // Check if we need a new page
          if (y + (splitText.length * 6) > pdfHeight - margin) {
            pdf.addPage();
            currentPage++;
            
            // Add page number
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Page ${currentPage} of ${2 + episodes.length}`, pdfWidth - margin, pdfHeight - 10);
            
            y = margin;
          }
          
          pdf.text(splitText, margin, y);
          y += (splitText.length * 6) + 8; // Increased spacing between paragraphs
        }
        
        // Add page number
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${currentPage} of ${2 + episodes.length}`, pdfWidth - margin, pdfHeight - 10);
      }
      
      // Save the PDF
      pdf.save(`${storyBible.title.replace(/\s+/g, '_')}_Complete_Story.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!storyBible) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="step5-container">
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
          <div className="step completed">3</div>
          <div className="step-label">Customize Story</div>
        </div>
        <div className="step-indicator">
          <div className="step completed">4</div>
          <div className="step-label">Story Bible</div>
        </div>
        <div className="step-indicator">
          <div className="step active">5</div>
          <div className="step-label">Full Story</div>
        </div>
      </div>

      <div className="episodes-container">
        <h1>Generate Your Story Episodes</h1>
        <p className="subtitle">Create detailed episodes based on your story bible</p>
        
        <div className="story-title-section">
          <h2>{storyBible.title}</h2>
          <p className="tagline">{storyBible.tagline}</p>
          
          {episodes.length > 0 && (
            <button 
              className="download-all-button"
              onClick={downloadAllEpisodesPDF}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <span className="loading-spinner"></span>
                  Generating PDF...
                </>
              ) : (
                <>
                  <i className="fas fa-file-download"></i> Download Complete Story
                </>
              )}
            </button>
          )}
        </div>
        
        <div className="episodes-content">
          <div className="episodes-sidebar">
            <h3>Episodes</h3>
            <div className="episodes-list">
              {episodes.map((episode, index) => (
                <div 
                  key={index} 
                  className={`episode-item ${currentEpisode === episode.number ? 'active' : ''}`}
                  onClick={() => handleSelectEpisode(index)}
                >
                  <span className="episode-number">#{episode.number}</span>
                  <span className="episode-title">{episode.title}</span>
                </div>
              ))}
              
              {episodes.length === 0 && (
                <div className="no-episodes">
                  No episodes generated yet. Click the "Generate Episode" button to start.
                </div>
              )}
              
              {currentEpisode > episodes.length && (
                <div className="episode-item new">
                  <span className="episode-number">#{currentEpisode}</span>
                  <span className="episode-title">New Episode</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="episode-main-content">
            {episodeTitle ? (
              <div className="episode-content" ref={episodeContentRef}>
                <h2 className="episode-title">
                  Episode {currentEpisode}: {episodeTitle}
                </h2>
                
                <div className="episode-text">
                  {episodeContent.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
                
                <div className="episode-actions">
                  <button 
                    className="download-episode-button"
                    onClick={downloadEpisodePDF}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download"></i> Download Episode
                      </>
                    )}
                  </button>
                  
                  <button 
                    className="next-episode-button"
                    onClick={handleNextEpisode}
                  >
                    Next Episode <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            ) : (
              <div className="generate-episode-panel">
                <h3>Episode #{currentEpisode}</h3>
                <p>
                  Generate a detailed episode with plot, characters, and dialogue based on your story bible.
                </p>
                
                {error && <div className="error-message">{error}</div>}
                
                <button 
                  className="generate-button"
                  onClick={generateEpisode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic"></i> Generate Episode
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="navigation-buttons">
          <button className="back-button" onClick={handleGoBack}>
            <i className="fas fa-arrow-left"></i> Back to Story Bible
          </button>
        </div>
      </div>
    </div>
  );
}

export default Step5Page; 