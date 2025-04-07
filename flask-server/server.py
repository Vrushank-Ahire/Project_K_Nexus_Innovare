from flask import Flask, request, jsonify
from flask_cors import CORS
from storyforge import StoryForgeLLM, process_user_query, generate_story_bible
import storyforge
import json

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
            {"path": "/generate_episode", "method": "POST", "description": "Generate an episode based on a story bible"}
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
        perspective = data.get('perspective', {})
        parameters = data.get('parameters', {})
        importance = data.get('importance', {})
        
        if not perspective:
            return jsonify({"error": "No perspective provided"}), 400
            
        # Generate the story bible using the selected perspective and parameters
        story_bible = generate_story_bible(
            llm=llm, 
            perspective=perspective,
            parameters=parameters,
            importance=importance
        )
        
        # Return the story bible to the frontend
        return jsonify({
            "success": True,
            "storyBible": story_bible
        })
    except Exception as e:
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

def craft_episode_prompt(story_bible, episode_number, previous_episodes):
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
    beginning, middle, and end, though it can leave threads for future episodes.
    
    STORY TITLE: {title}
    TAGLINE: {tagline}
    
    STORY PREMISE: {premise}
    
    GENRE: {genre}
    TONE: {tone}
    
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
        Act 3: {plot.get('act3', 'Resolution and conclusion')}
        """
    else:
        # Default plot structure if none provided
        prompt += """
        PLOT STRUCTURE:
        Act 1: Introduction of characters and setting, with an inciting incident
        Act 2: Development of conflict and rising action
        Act 3: Climax and resolution
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
       - Hooks for future episodes
    
    Format the episode as a well-structured narrative that could be read as a standalone 
    story while fitting into the larger story arc. Include dialogue formatting with 
    character names followed by their lines. Make the episode approximately 1500-2000 words.
    
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
    
    # Structure the episode data
    episode_data = {
        "title": title,
        "content": content,
        "scenes": [] # We could try to parse scenes, but for simplicity we'll leave this empty for now
    }
    
    return episode_data

if __name__ == "__main__":
    app.run(debug=True)