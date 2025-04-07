import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../styles/Step4Page.css';

function Step4Page() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDownloading, setIsDownloading] = useState(false);
  const bibleContentRef = useRef(null);
  
  // Get the story bible from location state
  const storyBible = location.state?.storyBible;
  
  // If no story bible, redirect back to step 1
  if (!storyBible) {
    navigate('/');
    return null;
  }

  const handleGoBack = () => {
    navigate('/step3', { 
      state: { 
        perspective: location.state?.perspective,
        perspectives: location.state?.perspectives
      } 
    });
  };

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  const generatePDF = async () => {
    if (!bibleContentRef.current) return;
    
    setIsDownloading(true);
    
    try {
      const contentElement = bibleContentRef.current;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const title = storyBible.title || 'Story Bible';
      
      // PDF configuration
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pdfWidth - (margin * 2);
      
      // Add title page
      pdf.setFontSize(24);
      pdf.setTextColor(60, 60, 60);
      pdf.text(title, pdfWidth / 2, 40, { align: 'center' });
      
      if (storyBible.tagline) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(storyBible.tagline, pdfWidth / 2, 50, { align: 'center' });
      }
      
      pdf.setFontSize(14);
      pdf.setTextColor(80, 80, 80);
      pdf.text('STORY BIBLE', pdfWidth / 2, 70, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      const date = new Date().toLocaleDateString();
      pdf.text(`Generated on ${date}`, pdfWidth / 2, pdfHeight - 20, { align: 'center' });
      
      pdf.addPage();
      
      // Generate all content sections for PDF
      const allTabs = ['overview', 'characters', 'plot', 'world', 'themes'];
      const originalTab = activeTab;
      
      // Temporarily switch to each tab to capture its content
      for (const tab of allTabs) {
        setActiveTab(tab);
        
        // Force a re-render to ensure the tab content is visible
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Capture the current tab content
        const canvas = await html2canvas(contentElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Add section title
        pdf.setFontSize(16);
        pdf.setTextColor(60, 60, 60);
        
        let tabTitle = 'Overview';
        switch (tab) {
          case 'characters': tabTitle = 'Characters'; break;
          case 'plot': tabTitle = 'Plot Structure'; break;
          case 'world': tabTitle = 'World Building'; break;
          case 'themes': tabTitle = 'Themes & Conflicts'; break;
        }
        
        pdf.text(tabTitle, margin, margin + 5);
        pdf.setDrawColor(80, 175, 80); // Green color for the line
        pdf.setLineWidth(0.5);
        pdf.line(margin, margin + 8, margin + 40, margin + 8);
        
        // Calculate aspect ratio to fit content to page width
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        const contentWidth = maxWidth;
        const contentHeight = contentWidth / ratio;
        
        // Add content image ensuring it fits on the page
        let yPosition = margin + 15;
        
        // If content would go beyond page, add a new page
        if (yPosition + contentHeight > pdfHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.addImage(imgData, 'JPEG', margin, yPosition, contentWidth, contentHeight);
        
        // Add page break after each section
        if (tab !== allTabs[allTabs.length - 1]) {
          pdf.addPage();
        }
      }
      
      // Restore original active tab
      setActiveTab(originalTab);
      
      // Save the PDF
      pdf.save(`${title.replace(/\s+/g, '_')}_Story_Bible.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleContinue = () => {
    // Navigate to step 5 with the story bible data
    navigate('/step5', { 
      state: { 
        storyBible: storyBible,
        perspective: location.state?.perspective,
        perspectives: location.state?.perspectives
      } 
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="tab-content">
            <h2>Story Overview</h2>
            <p className="story-premise">{storyBible.premise}</p>
            
            <div className="story-details">
              <div className="detail-item">
                <h3>Theme</h3>
                <p>{storyBible.theme}</p>
              </div>
              <div className="detail-item">
                <h3>Setting</h3>
                <p>{storyBible.setting}</p>
              </div>
              <div className="detail-item">
                <h3>Tone</h3>
                <p>{storyBible.tone}</p>
              </div>
              <div className="detail-item">
                <h3>Genre</h3>
                <p>{storyBible.genre}</p>
              </div>
            </div>
          </div>
        );
      
      case 'characters':
        return (
          <div className="tab-content">
            <h2>Characters</h2>
            <div className="characters-list">
              {storyBible.characters.map((character, index) => (
                <div key={index} className="character-card">
                  <h3>{character.name}</h3>
                  <div className="character-details">
                    <div className="detail-row">
                      <span className="detail-label">Role:</span>
                      <span className="detail-value">{character.role}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Traits:</span>
                      <span className="detail-value">{character.traits}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Motivation:</span>
                      <span className="detail-value">{character.motivation}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Background:</span>
                      <span className="detail-value">{character.background}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Arc:</span>
                      <span className="detail-value">{character.arc}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'plot':
        return (
          <div className="tab-content">
            <h2>Plot Structure</h2>
            
            <div className="plot-structure">
              <div className="plot-section">
                <h3>Act 1: Setup</h3>
                <p>{storyBible.plot.act1}</p>
              </div>
              
              <div className="plot-section">
                <h3>Act 2: Confrontation</h3>
                <p>{storyBible.plot.act2}</p>
              </div>
              
              <div className="plot-section">
                <h3>Act 3: Resolution</h3>
                <p>{storyBible.plot.act3}</p>
              </div>
            </div>
            
            <div className="key-events">
              <h3>Key Plot Points</h3>
              <ol className="events-list">
                {storyBible.plot.keyEvents.map((event, index) => (
                  <li key={index}>
                    <div className="event-item">
                      <h4>{event.title}</h4>
                      <p>{event.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        );
      
      case 'world':
        return (
          <div className="tab-content">
            <h2>World Building</h2>
            
            <div className="world-sections">
              <div className="world-section">
                <h3>Physical Environment</h3>
                <p>{storyBible.worldBuilding.environment}</p>
              </div>
              
              <div className="world-section">
                <h3>Society & Culture</h3>
                <p>{storyBible.worldBuilding.society}</p>
              </div>
              
              <div className="world-section">
                <h3>Rules & Systems</h3>
                <p>{storyBible.worldBuilding.rules}</p>
              </div>
              
              <div className="world-section">
                <h3>History & Background</h3>
                <p>{storyBible.worldBuilding.history}</p>
              </div>
            </div>
            
            <div className="locations">
              <h3>Key Locations</h3>
              <div className="locations-grid">
                {storyBible.worldBuilding.locations.map((location, index) => (
                  <div key={index} className="location-card">
                    <h4>{location.name}</h4>
                    <p>{location.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'themes':
        return (
          <div className="tab-content">
            <h2>Themes & Conflicts</h2>
            
            <div className="themes-section">
              <h3>Central Themes</h3>
              <ul className="themes-list">
                {storyBible.themes.central.map((theme, index) => (
                  <li key={index}>
                    <div className="theme-item">
                      <h4>{theme.name}</h4>
                      <p>{theme.exploration}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="conflicts-section">
              <h3>Major Conflicts</h3>
              <div className="conflicts-grid">
                {storyBible.conflicts.map((conflict, index) => (
                  <div key={index} className="conflict-card">
                    <h4>{conflict.type}</h4>
                    <p>{conflict.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return <div className="tab-content empty">Select a tab to view content</div>;
    }
  };

  return (
    <div className="step4-container">
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
          <div className="step active">4</div>
          <div className="step-label">Story Bible</div>
        </div>
        <div className="step-indicator">
          <div className="step">5</div>
          <div className="step-label">Full Story</div>
        </div>
      </div>

      <div className="bible-container">
        <h1>Your Story Bible</h1>
        <p className="subtitle">Use this detailed guide to develop your story</p>
        
        <div className="bible-title-section">
          <div className="bible-title">
            <h2>{storyBible.title}</h2>
            <p className="tagline">{storyBible.tagline}</p>
          </div>
        </div>
        
        <div className="bible-navigation">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabClick('overview')}
            >
              <i className="fas fa-clipboard"></i> Overview
            </button>
            <button 
              className={`tab ${activeTab === 'characters' ? 'active' : ''}`}
              onClick={() => handleTabClick('characters')}
            >
              <i className="fas fa-user"></i> Characters
            </button>
            <button 
              className={`tab ${activeTab === 'plot' ? 'active' : ''}`}
              onClick={() => handleTabClick('plot')}
            >
              <i className="fas fa-chart-line"></i> Plot
            </button>
            <button 
              className={`tab ${activeTab === 'world' ? 'active' : ''}`}
              onClick={() => handleTabClick('world')}
            >
              <i className="fas fa-globe"></i> World
            </button>
            <button 
              className={`tab ${activeTab === 'themes' ? 'active' : ''}`}
              onClick={() => handleTabClick('themes')}
            >
              <i className="fas fa-lightbulb"></i> Themes
            </button>
          </div>
        </div>
        
        <div className="bible-content" ref={bibleContentRef}>
          {renderTabContent()}
        </div>
        
        <div className="navigation-buttons">
          <button className="back-button" onClick={handleGoBack}>
            <i className="fas fa-arrow-left"></i> Back to Customization
          </button>
          
          <div className="right-buttons">
            <button 
              className="download-button" 
              onClick={generatePDF}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <span className="loading-spinner"></span>
                  Generating PDF...
                </>
              ) : (
                <>
                  <i className="fas fa-download"></i> Download Story Bible
                </>
              )}
            </button>
            
            <button className="continue-button" onClick={handleContinue}>
              Generate Full Story <i className="fas fa-book-open"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step4Page; 