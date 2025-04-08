from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from storyforge import StoryForgeLLM, process_user_query, generate_story_bible
import storyforge
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from io import BytesIO
import tempfile
import os
from reportlab.lib import colors
from reportlab.platypus.flowables import HRFlowable

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

llm = StoryForgeLLM()  # Initialize the LLM client

# Root route for testing
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "ok",
        "message": "Story Forge API is running",
        "endpoints": [
            {"path": "/generate", "method": "POST", "description": "Generate perspectives from a user query"},
            {"path": "/generate-story-bible", "method": "POST", "description": "Generate a story bible from a perspective"},
            {"path": "/generate_episode", "method": "POST", "description": "Generate an episode based on a story bible"},
            {"path": "/generate-episode-pdf", "method": "POST", "description": "Generate a PDF for an episode"},
            {"path": "/generate-story-bible-pdf", "method": "POST", "description": "Generate a PDF for a story bible"}
        ]
    })

# Members API Route

@app.route("/generate", methods=["POST"])
def generate():
    try:
        # Get user query from the request
        data = request.json
        user_query = data.get('query', '')
        
        if not user_query:
            return jsonify({"error": "No query provided"}), 400
        
        # Process the user query using StoryForge pipeline
        perspectives = process_user_query(llm, user_query)
        
        # Return the perspectives to the frontend
        return jsonify({
            "success": True,
            "perspectives": perspectives
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/generate-story-bible", methods=["POST"])
def create_story_bible():
    try:
        # Get data from the request
        data = request.json
        print("Received request data:", data)  # Debug log
        
        perspective = data.get('perspective', {})
        parameters = data.get('parameters', {})
        prompt = data.get('prompt', '')
        
        if not perspective:
            return jsonify({"error": "No perspective provided"}), 400
            
        # Set default importance values
        importance = {
            "characterDevelopment": 3,
            "plotComplexity": 3,
            "worldBuilding": 3,
            "dialogueQuality": 3,
            "thematicDepth": 3
        }
            
        print("Generating story bible with:", {  # Debug log
            "perspective": perspective,
            "parameters": parameters,
            "prompt": prompt,
            "importance": importance
        })
            
        # Generate the story bible using the selected perspective and parameters
        story_bible = generate_story_bible(
            llm=llm, 
            perspective=perspective,
            parameters=parameters,
            importance=importance,
            original_query=prompt
        )
        
        if not story_bible:
            return jsonify({"error": "Failed to generate story bible"}), 500
        
        print("Successfully generated story bible")  # Debug log
        
        # Return the story bible to the frontend
        return jsonify({
            "success": True,
            "storyBible": story_bible
        })
    except Exception as e:
        print("Error in create_story_bible:", str(e))  # Debug log
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/generate_episode', methods=['POST'])
def generate_episode():
    """
    Generate a story episode based on the story bible and previous episodes.
    
    The request should include:
    - storyBible: The complete story bible with characters, plot, world, etc.
    - episodeNumber: The number of the current episode to generate
    - previousEpisodes: Array of previously generated episodes (can be empty)
    """
    try:
        # Get data from request
        data = request.json
        story_bible = data.get('storyBible')
        episode_number = data.get('episodeNumber', 1)
        previous_episodes = data.get('previousEpisodes', [])
        
        if not story_bible:
            return jsonify({'error': 'Story bible is required'}), 400
        
        # Craft a detailed prompt for the episode generation
        prompt = craft_episode_prompt(story_bible, episode_number, previous_episodes)
        
        # Generate the episode using the AI
        response = storyforge.generate_episode(prompt)
        
        # Parse the response into a structured format
        episode_data = parse_episode_response(response)
        
        return jsonify(episode_data)
    
    except Exception as e:
        print(f"Error generating episode: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate-episode-pdf', methods=['POST'])
def generate_episode_pdf():
    try:
        data = request.json
        episode_title = data.get('title', 'Untitled Episode')
        episode_content = data.get('content', '')
        story_title = data.get('storyTitle', 'Untitled Story')
        episode_number = data.get('episodeNumber', 1)
        
        if not episode_content:
            return jsonify({"error": "No episode content provided"}), 400
            
        # Create a BytesIO buffer for the PDF
        buffer = BytesIO()
        
        # Create PDF
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Create styles
        styles = getSampleStyleSheet()
        
        # Title styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1,  # Center alignment
            textColor=colors.HexColor('#4CAF50')  # Green color for title
        )
        
        episode_title_style = ParagraphStyle(
            'CustomEpisodeTitle',
            parent=styles['Heading2'],
            fontSize=20,
            spaceAfter=20,
            alignment=1,  # Center alignment
            textColor=colors.HexColor('#4CAF50')  # Green color for episode title
        )

        scene_heading_style = ParagraphStyle(
            'SceneHeading',
            parent=styles['Heading3'],
            fontSize=14,
            spaceBefore=12,
            spaceAfter=8,
            textColor=colors.HexColor('#4CAF50'),
            fontName='Helvetica-Bold'
        )
        
        # Content style (for markdown text)
        content_style = ParagraphStyle(
            'Content',
            parent=styles['Normal'],
            fontSize=12,
            leading=16,
            spaceBefore=6,
            spaceAfter=6,
            textColor=colors.black
        )
        
        # Create story elements
        story = []
        
        try:
            # Add main title
            story.append(Paragraph(story_title, title_style))
            story.append(Spacer(1, 12))
            
            # Add episode title
            story.append(Paragraph(f"Episode {episode_number}: {episode_title}", episode_title_style))
            story.append(Spacer(1, 24))
            
            # Process markdown content
            lines = episode_content.split('\n')
            current_paragraph = []
            
            for line in lines:
                try:
                    if not line.strip():
                        if current_paragraph:
                            # Clean up any malformed HTML tags
                            paragraph_text = ' '.join(current_paragraph)
                            paragraph_text = clean_html_tags(paragraph_text)
                            story.append(Paragraph(paragraph_text, content_style))
                            current_paragraph = []
                        story.append(Spacer(1, 12))
                        continue
                        
                    # Handle markdown headers and scene headings
                    if line.startswith('# '):
                        if current_paragraph:
                            paragraph_text = ' '.join(current_paragraph)
                            paragraph_text = clean_html_tags(paragraph_text)
                            story.append(Paragraph(paragraph_text, content_style))
                            current_paragraph = []
                        story.append(Paragraph(line[2:], title_style))
                    elif line.startswith('## '):
                        if current_paragraph:
                            paragraph_text = ' '.join(current_paragraph)
                            paragraph_text = clean_html_tags(paragraph_text)
                            story.append(Paragraph(paragraph_text, content_style))
                            current_paragraph = []
                        story.append(Paragraph(line[3:], episode_title_style))
                    elif line.startswith('### ') or 'Scene' in line:
                        if current_paragraph:
                            paragraph_text = ' '.join(current_paragraph)
                            paragraph_text = clean_html_tags(paragraph_text)
                            story.append(Paragraph(paragraph_text, content_style))
                            current_paragraph = []
                        # Clean up scene heading
                        scene_text = line.replace('### ', '').strip()
                        scene_text = clean_html_tags(scene_text)
                        story.append(Paragraph(scene_text, scene_heading_style))
                    # Handle bold and italic
                    elif '**' in line or '__' in line or '*' in line or '_' in line:
                        # Replace markdown with proper HTML tags
                        line = line.replace('**', '<b>').replace('__', '<b>')
                        line = line.replace('*', '<i>').replace('_', '<i>')
                        # Clean up and balance tags
                        line = clean_html_tags(line)
                        current_paragraph.append(line)
                    # Handle blockquotes
                    elif line.startswith('>'):
                        if current_paragraph:
                            paragraph_text = ' '.join(current_paragraph)
                            paragraph_text = clean_html_tags(paragraph_text)
                            story.append(Paragraph(paragraph_text, content_style))
                            current_paragraph = []
                        quote_text = line[1:].strip()
                        quote_text = clean_html_tags(quote_text)
                        story.append(Paragraph(quote_text, content_style))
                    # Regular text
                    else:
                        current_paragraph.append(line)
                except Exception as e:
                    print(f"Error processing line: {str(e)}")
                    # Skip problematic line and continue
                    continue
            
            # Add any remaining paragraph
            if current_paragraph:
                try:
                    paragraph_text = ' '.join(current_paragraph)
                    paragraph_text = clean_html_tags(paragraph_text)
                    story.append(Paragraph(paragraph_text, content_style))
                except Exception as e:
                    print(f"Error processing final paragraph: {str(e)}")
            
            # Build the PDF
            doc.build(story)
        except Exception as e:
            print(f"Error in PDF generation: {str(e)}")
            return jsonify({"error": f"Error generating PDF content: {str(e)}"}), 500
        
        # Get the value of the BytesIO buffer
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create a new BytesIO for the response
        response_buffer = BytesIO(pdf_data)
        response_buffer.seek(0)
        
        # Create the response with proper headers
        filename = f"{story_title.replace(' ', '_')}_Episode_{episode_number}_{episode_title.replace(' ', '_')}.pdf"
        response = send_file(
            response_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        
        return response
        
    except Exception as e:
        print(f"Error in generate_episode_pdf: {str(e)}")
        return jsonify({"error": str(e)}), 500

def clean_html_tags(text):
    """Clean up and balance HTML tags in text."""
    try:
        # Remove any para tags as they're not needed
        text = text.replace('<para>', '').replace('</para>', '')
        
        # Handle scene headings specially
        if 'Scene' in text:
            text = text.replace('<b>', '').replace('</b>', '')
            return text
        
        # Fix common issues with bold tags
        text = text.replace('<b><b>', '<b>')  # Remove double opening tags
        text = text.replace('</b></b>', '</b>')  # Remove double closing tags
        text = text.replace('<b></b>', '')  # Remove empty tags
        
        # Fix common issues with italic tags
        text = text.replace('<i><i>', '<i>')
        text = text.replace('</i></i>', '</i>')
        text = text.replace('<i></i>', '')
        
        # Handle nested tags
        text = text.replace('</b><b>', '')
        text = text.replace('</i><i>', '')
        
        # Count opening and closing tags
        b_open = text.count('<b>')
        b_close = text.count('</b>')
        i_open = text.count('<i>')
        i_close = text.count('</i>')
        
        # Balance tags
        if b_open > b_close:
            text += '</b>' * (b_open - b_close)
        elif b_close > b_open:
            text = '<b>' * (b_close - b_open) + text
            
        if i_open > i_close:
            text += '</i>' * (i_open - i_close)
        elif i_close > i_open:
            text = '<i>' * (i_close - i_open) + text
        
        # Remove any double spaces
        text = ' '.join(text.split())
        
        return text
    except Exception as e:
        print(f"Error in clean_html_tags: {str(e)}")
        # Return text without any HTML tags if there's an error
        return text.replace('<', '').replace('>', '')

@app.route('/generate-story-bible-pdf', methods=['POST'])
def generate_story_bible_pdf():
    try:
        data = request.json
        story_bible = data.get('storyBible', {})
        title = data.get('title', 'Story Bible')
        
        if not story_bible:
            return jsonify({"error": "No story bible provided"}), 400
            
        # Create a temporary file for the PDF
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_file_path = temp_file.name
        temp_file.close()
        
        # Create PDF
        doc = SimpleDocTemplate(
            temp_file_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Create styles
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1,  # Center alignment
            textColor='#4CAF50'  # Green color for title
        )
        
        # Section title style
        section_style = ParagraphStyle(
            'CustomSection',
            parent=styles['Heading2'],
            fontSize=18,
            spaceAfter=20,
            textColor='#4CAF50'
        )
        
        # Content style
        content_style = ParagraphStyle(
            'Content',
            parent=styles['Normal'],
            fontSize=12,
            leading=16,
            spaceBefore=6,
            spaceAfter=6
        )
        
        # Create story elements
        story = []
        
        # Add main title
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 12))
        
        # Add tagline if exists
        if story_bible.get('tagline'):
            story.append(Paragraph(story_bible['tagline'], content_style))
            story.append(Spacer(1, 24))
        
        # Add overview section
        if story_bible.get('overview'):
            story.append(Paragraph("Overview", section_style))
            story.append(Paragraph(story_bible['overview'], content_style))
            story.append(Spacer(1, 24))
        
        # Add characters section
        if story_bible.get('characters'):
            story.append(Paragraph("Characters", section_style))
            for character in story_bible['characters']:
                story.append(Paragraph(f"<b>{character.get('name', 'Unnamed Character')}</b>", content_style))
                story.append(Paragraph(f"Role: {character.get('role', 'Unknown')}", content_style))
                story.append(Paragraph(f"Traits: {character.get('traits', 'None specified')}", content_style))
                story.append(Paragraph(f"Motivation: {character.get('motivation', 'Unknown')}", content_style))
                story.append(Spacer(1, 12))
            story.append(Spacer(1, 24))
        
        # Add setting section
        if story_bible.get('setting'):
            story.append(Paragraph("Setting", section_style))
            story.append(Paragraph(story_bible['setting'], content_style))
            story.append(Spacer(1, 24))
        
        # Add plot section
        if story_bible.get('plot'):
            story.append(Paragraph("Plot", section_style))
            story.append(Paragraph(story_bible['plot'], content_style))
            story.append(Spacer(1, 24))
        
        # Add themes section
        if story_bible.get('themes'):
            story.append(Paragraph("Themes", section_style))
            story.append(Paragraph(story_bible['themes'], content_style))
            story.append(Spacer(1, 24))
        
        # Add tone section
        if story_bible.get('tone'):
            story.append(Paragraph("Tone", section_style))
            story.append(Paragraph(story_bible['tone'], content_style))
            story.append(Spacer(1, 24))
        
        # Add audience section
        if story_bible.get('audience'):
            story.append(Paragraph("Target Audience", section_style))
            story.append(Paragraph(story_bible['audience'], content_style))
        
        # Build PDF
        doc.build(story)
        
        # Read the generated PDF
        with open(temp_file_path, 'rb') as f:
            pdf_data = f.read()
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        # Create response
        response = BytesIO(pdf_data)
        response.seek(0)
        
        return send_file(
            response,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"{title.replace(' ', '_')}.pdf"
        )
        
    except Exception as e:
        print("Error generating story bible PDF:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def craft_episode_prompt(story_bible, episode_number, previous_episodes, original_query=''):
    """Craft a detailed prompt for episode generation"""
    
    # Ensure story_bible has all necessary fields or set defaults
    title = story_bible.get('title', 'Untitled Story')
    tagline = story_bible.get('tagline', 'A compelling tale')
    premise = story_bible.get('premise', 'A story waiting to be told')
    genre = story_bible.get('genre', 'fiction')
    tone = story_bible.get('tone', 'balanced')
    
    # Base prompt with story bible context
    prompt = f"""
    Based on the following story bible, create a detailed Episode {episode_number} with compelling plot, 
    vivid scenes, and realistic dialogue between characters. This should be a complete episode with 
    beginning, middle, and end, though it must end with a strong hook for the next episode.
    
    STORY TITLE: {title}
    TAGLINE: {tagline}
    
    STORY PREMISE: {premise}
    
    GENRE: {genre}
    TONE: {tone}
    
    ORIGINAL STORY IDEA: {original_query}
    
    MAIN CHARACTERS:
    """
    
    # Add character details
    characters = story_bible.get('characters', [])
    if characters:
        for character in characters:
            prompt += f"""
            - {character.get('name', 'Unnamed Character')}: {character.get('role', 'Unknown Role')}
              Traits: {character.get('traits', 'No traits specified')}
              Motivation: {character.get('motivation', 'Unknown motivation')}
            """
    else:
        # Default characters if none provided
        prompt += """
        - Protagonist: Main character
          Traits: Determined, resourceful
          Motivation: To overcome challenges and find success
          
        - Antagonist: Opposition character
          Traits: Clever, persistent
          Motivation: To achieve their own goals at the expense of others
        """
    
    # Add plot structure context
    plot = story_bible.get('plot', {})
    if plot:
        prompt += f"""
        PLOT STRUCTURE:
        Act 1: {plot.get('act1', 'Setup and inciting incident')}
        Act 2: {plot.get('act2', 'Confrontation and complications')}
        Act 3: {plot.get('act3', 'Resolution and hook for next episode')}
        """
    else:
        # Default plot structure if none provided
        prompt += """
        PLOT STRUCTURE:
        Act 1: Introduction of characters and setting, with an inciting incident
        Act 2: Development of conflict and rising action
        Act 3: Climax and hook for next episode
        """
    
    # Add world details
    world = story_bible.get('worldBuilding', {})
    if world:
        prompt += f"""
        WORLD CONTEXT:
        Environment: {world.get('environment', 'Unspecified environment')}
        Society: {world.get('society', 'Unspecified society')}
        Rules: {world.get('rules', 'Standard rules apply')}
        """
    else:
        # Default world context if none provided
        prompt += """
        WORLD CONTEXT:
        Environment: A world similar to our own with unique elements
        Society: A structured society with various social classes
        Rules: Normal laws of physics apply with some creative liberties
        """
    
    # Add context from previous episodes if they exist
    if previous_episodes:
        prompt += "\nPREVIOUS EPISODES SUMMARY:\n"
        for ep in previous_episodes:
            prompt += f"Episode {ep.get('number')}: {ep.get('title')} - "
            # Add a brief summary if the content is long
            content = ep.get('content', '')
            summary = content[:300] + "..." if len(content) > 300 else content
            prompt += f"{summary}\n\n"
    
    # Request specific output format
    prompt += f"""
    For Episode {episode_number}, please create:
    1. An engaging title that reflects the episode's main focus
    2. A complete episode with multiple scenes, including:
       - Clear scene descriptions
       - Character interactions with dialogue
       - Internal character thoughts where appropriate
       - Conflict and resolution
       - A compelling hook at the end that:
         * Creates suspense or raises new questions
         * Introduces a new mystery or challenge
         * Sets up the next episode's conflict
         * Leaves readers wanting more
    
    Format the episode as a well-structured narrative that could be read as a standalone 
    story while fitting into the larger story arc. Include dialogue formatting with 
    character names followed by their lines. Make the episode approximately 1500-2000 words.
    
    IMPORTANT: The episode MUST end with a clear hook that makes readers eager for the next installment.
    The hook should be the last paragraph of the episode and should be clearly marked with "HOOK:" at the beginning.
    
    EPISODE TITLE: [Create an engaging title]
    
    [Full episode content with multiple scenes and dialogue]
    """
    
    return prompt

def parse_episode_response(response):
    """Parse the AI response into a structured episode format"""
    
    # Extract title and content
    lines = response.strip().split('\n')
    
    title = "Untitled Episode"
    content = response
    
    # Try to find the title in the response
    title_indicators = ["EPISODE TITLE:", "Title:", "Episode Title:"]
    
    for i, line in enumerate(lines):
        # Check for explicit title markers
        for indicator in title_indicators:
            if indicator in line:
                title_parts = line.split(":", 1)
                if len(title_parts) > 1:
                    title = title_parts[1].strip()
                    # Remove the title line from content
                    content = '\n'.join(lines[i+1:]).strip()
                    break
        
        # In case we found a title
        if title != "Untitled Episode":
            break
    
    # If we didn't find a title with the prefixes, look for patterns
    if title == "Untitled Episode" and lines:
        # Check if first line is title-like (short, no period at end)
        first_line = lines[0].strip()
        if len(first_line) < 100 and not first_line.endswith('.') and not first_line.startswith('#'):
            title = first_line
            content = '\n'.join(lines[1:]).strip()
    
    # Clean title of any markdown formatting or quotes
    title = title.replace('*', '').replace('_', '').replace('"', '').replace("'", "").strip()
    
    # Ensure there's a hook at the end
    if not any(hook_phrase in content.lower() for hook_phrase in ["hook:", "to be continued", "what happens next", "little did they know", "but that was just the beginning"]):
        content += "\n\nHOOK: To be continued..."
    
    # Structure the episode data
    episode_data = {
        "title": title,
        "content": content,
        "scenes": [] # We could try to parse scenes, but for simplicity we'll leave this empty for now
    }
    
    return episode_data

if __name__ == "__main__":
    app.run(debug=True)