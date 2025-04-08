from typing import List, Dict, Any, Union, Optional
import json
import time
import traceback
from datetime import datetime
import os
import re
import warnings
import requests
from io import BytesIO
from PIL import Image
from bson.objectid import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import base64

# Import necessary libraries for OpenAI and ChromaDB
from openai import OpenAI
import chromadb
from chromadb.config import Settings

# Suppress specific warnings
warnings.filterwarnings('ignore')
load_dotenv()

# Access the OPENAI_API_KEY
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
try:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    print("OpenAI client initialized successfully")
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    openai_client = None

## 1. LLM Initialization with robust error handling
class StoryForgeLLM:
    def __init__(self):
        # System prompt template
        self.system_prompt = """You are StoryForge AI, an advanced story generation assistant. 
        You specialize in creating rich, coherent narratives with well-developed characters, 
        compelling plots, and immersive worlds. Follow the instructions carefully and 
        generate high-quality story content."""

    def generate(self, prompt: str, model: str = "gpt-4o", temperature: float = 0.7, max_tokens: int = 8000) -> str:
        """Generate text using the LLM with the given prompt"""
        if not openai_client:
            print("OpenAI client not initialized properly.")
            return "Error: OpenAI client not initialized"
        
        # Retry mechanism for API calls
        max_retries = 3
        retry_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                response = openai_client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=0.9
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Attempt {attempt+1}/{max_retries} - Error in LLM generation: {e}")
                if attempt < max_retries - 1:
                    print(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    print("All retries failed.")
                    return f"Error generating content: {str(e)}"


class StoryMemory:
    def __init__(self):
        self.use_openai_embeddings = True if openai_client else False
        
        # Initialize ChromaDB client
        try:
            self.chroma_client = chromadb.PersistentClient(path=".chromadb")
            self.collection = self.chroma_client.get_or_create_collection(
                name="story_memory",
                metadata={"hnsw:space": "cosine"}  # Keep cosine similarity
            )
        except Exception as e:
            print(f"Error initializing ChromaDB: {e}")
            self.chroma_client = None
            self.collection = None
        
        # Initialize MongoDB for document storage
        try:
            self.mongo_client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
            if self.mongo_client is not None:
                self.mongo_client.admin.command('ping')
                self.db = self.mongo_client['storyforge']
                self.memory_collection = self.db['memory']
        except Exception as e:
            print(f"Error initializing MongoDB: {e}")

    def _get_embedding(self, text: str) -> List[float]:
        """Get embedding using OpenAI's API"""
        if not self.use_openai_embeddings or not openai_client:
            return []
            
        try:
            response = openai_client.embeddings.create(
                input=text,
                model="text-embedding-3-small"
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error getting OpenAI embedding: {e}")
            return []

    def store(self, content: str, metadata: dict = None) -> str:
        """Store content in memory with optional metadata"""
        if metadata is None:
            metadata = {}
            
        doc_id = str(datetime.now().timestamp())
        embedding = self._get_embedding(content)
        
        # MongoDB Storage
        if self.memory_collection is not None:
            try:
                doc = {
                    "content": content,
                    "embedding": embedding,
                    "metadata": metadata,
                    "timestamp": datetime.utcnow()
                }
                result = self.memory_collection.insert_one(doc)
                doc_id = str(result.inserted_id)
            except Exception as e:
                print(f"Error storing in MongoDB: {e}")

        # ChromaDB Storage
        if self.collection is not None and embedding:  # Only store if we have an embedding
            try:
                # Prepare metadata for ChromaDB (only simple types)
                chroma_metadata = {
                    k: str(v) for k, v in metadata.items() 
                    if isinstance(v, (str, int, float, bool))
                }
                
                # Ensure we have at least some metadata
                if not chroma_metadata:
                    chroma_metadata = {"timestamp": datetime.now().isoformat()}
                
                self.collection.add(
                    ids=[doc_id],
                    embeddings=[embedding],
                    documents=[content],
                    metadatas=[chroma_metadata]
                )
            except Exception as e:
                print(f"Error storing in ChromaDB: {e}")
        
        return doc_id

    def retrieve(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """Retrieve relevant memories using OpenAI embeddings"""
        if not self.collection or not self.use_openai_embeddings:
            print("Retrieval services not available")
            return []
        
        try:
            query_embedding = self._get_embedding(query)
            if not query_embedding:
                return []
                
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=k
            )
            
            return [{
                "content": results['documents'][0][i],
                "metadata": results['metadatas'][0][i],
                "score": 1 - results['distances'][0][i]  # Convert cosine distance to similarity
            } for i in range(len(results['ids'][0]))]
        except Exception as e:
            print(f"Error during retrieval: {e}")
            return []
        
# ## 3. Query Processing Module with improved error handling
# def process_user_query(llm: StoryForgeLLM, query: str) -> List[str]:
#     """Generate multiple perspectives from a user query"""
#     prompt = f"""The user has provided the following story idea:

#     "{query}"

#     Please generate 3 different perspectives or angles for this story. Each perspective should focus on a different aspect:
#     1. Character-focused perspective
#     2. Plot-focused perspective
#     3. World-focused perspective

#     Format each perspective as a brief 1-2 sentence description that could serve as a story prompt.
#     Return them as a numbered list."""
#     response = llm.generate(prompt)
#     if response.startswith("Error:"):
#         print(f"Failed to generate perspectives: {response}")
#         # Provide default perspectives as fallback
#         return [
#             f"Character-focused: A character explores {query}.",
#             f"Plot-focused: A series of events around {query}.",
#             f"World-focused: A world where {query} is central."
#         ]
    
#     # Process the response to extract perspectives
#     try:
#         # Remove numbering and clean up
#         perspectives = []
#         for line in response.split('\n'):
#             line = line.strip()
#             if line and line not in perspectives:
#                 # Remove numbering and other prefixes
#                 if line[0].isdigit() and '. ' in line:
#                     line = line.split('. ', 1)[1]
#                 if line.startswith("**") and "**" in line[2:]:
#                     line = line.replace("**", "")
#                 perspectives.append(line)
        
#         # Ensure we have at least 3 perspectives
#         while len(perspectives) < 3:
#             perspectives.append(f"Additional perspective on {query}.")
            
#         return perspectives[:3]  # Return first 3 perspectives
#     except Exception as e:
#         print(f"Error processing perspectives: {e}")
#         return [
#             f"Character-focused: A character explores {query}.",
#             f"Plot-focused: A series of events around {query}.",
#             f"World-focused: A world where {query} is central."
#         ]

# def process_user_query(llm: StoryForgeLLM, query: str) -> List[str]:
#     """Generate 4 detailed perspectives to clarify the user's story idea and eliminate ambiguity"""
#     prompt = f"""The user has provided the following story idea: "{query}"

#     Generate 4 distinct, detailed perspectives that explore different interpretations of this idea. 
#     Each perspective should:
#     1. Be 3-4 sentences long
#     2. Clearly articulate a unique interpretation
#     3. Provide concrete details that bring the perspective to life
#     4. Cover different aspects of storytelling

#     Use these specific perspective types:
#     1. Character-Driven: Focus on protagonist's personal journey
#     2. Plot-Driven: Focus on key events and conflicts  
#     3. World-Driven: Focus on setting and atmosphere
#     4. Theme-Driven: Focus on deeper meaning and message

#     Format each of the 4 perspectives clearly with this exact structure and only output the JSON list:
#     {{
#         "type": "genre_name",
#         "icon": "font_awesome_icon",
#         "title": "Creative Title",
#         "preview": "2-3 sentence atmospheric preview"
#     }}
#     """

#     response = llm.generate(prompt)
#     if response.startswith("Error:"):
#         print(f"Failed to generate perspectives: {response}")
#         # Provide default perspectives as fallback
#         return """[
#     {
#       "type": 'fantasy',
#       "icon": 'fas fa-dragon',
#       "title": 'Fantasy Quest',
#       "preview": 'The ancient forest of Eldermere held secrets that few dared to uncover. As the morning mist parted, revealing the twisted path ahead, Lyra knew this was the journey she had been preparing for all her life. The Oracles words still echoed in her mind: Find the Crimson Crystal before the solstice, or darkness will consume the realm.'
#     },
#     {
#       "type": 'scifi',
#       "icon": 'fas fa-rocket',
#       "title": 'Sci-Fi Adventure',
#       "preview": 'The spaceship Nebula hummed with the familiar sound of its quantum engines as Captain Thorn stared at the unfamiliar readings on the display. We ve never seen energy signatures like these before, Lieutenant Vex said, her voice barely hiding her excitement. What they had discovered orbiting the binary star system would change humanitys understanding of the universe forever.'
#     },
#     {
#       "type": 'mystery',
#       "icon": 'fas fa-magnifying-glass',
#       "title": 'Coastal Mystery',
#       "preview": 'Detective Morgan Reed had seen enough crime scenes in her twenty years on the force, but something about this one made the hairs on the back of her neck stand up. The small fishing village of Harbor Bay rarely saw anything more serious than petty theft, yet here she was, staring at a cipher etched into the wooden dock where the body had been found.'
#     },
#     {
#       "type": 'romance',
#       "icon": 'fas fa-heart',
#       "title": 'Unexpected Romance',
#       "preview": 'Sofia never believed in coincidences, yet here she was, standing face to face with the same stranger she had helped during the thunderstorm three months ago. Ive been looking for you, he said with a smile that made her heart skip. The busy coffee shop seemed to fade away as their eyes met, and Sofia wondered if some encounters were truly written in the stars.'
#     }
#        ]"""
    
#     # Process the response to extract perspectives
#     try:
#         perspectives = []
#         current_perspective = ""
        
#         for line in response.split('\n'):
#             line = line.strip()
#             if line.startswith('[') and ']' in line:
#                 if current_perspective:  # Save the previous perspective
#                     perspectives.append(current_perspective.strip())
#                 current_perspective = line  # Start new perspective
#             elif current_perspective and line:
#                 current_perspective += " " + line
        
#         if current_perspective:  # Add the last perspective
#             perspectives.append(current_perspective.strip())
        
#         # Ensure we have exactly 4 perspectives
#         if len(perspectives) > 4:
#             perspectives = perspectives[:4]
#         elif len(perspectives) < 4:
#             # Fill missing perspectives with defaults
#             default_perspectives = [
#                 f"[Character-Driven] A protagonist's personal journey through {query}, facing internal and external conflicts.",
#                 f"[Plot-Driven] Key events triggered by {query} create a chain reaction of consequences.",
#                 f"[World-Driven] The unique environment where {query} occurs fundamentally shapes the story's possibilities.",
#                 f"[Theme-Driven] Underlying philosophical questions raised by {query} that challenge characters and readers alike."
#             ]
#             for i in range(4 - len(perspectives)):
#                 perspectives.append(default_perspectives[i])
        
#         return perspectives
#     except Exception as e:
#         print(f"Error processing perspectives: {e}")
#         return [
#             f"[Character-Driven] An individual's transformative experience with {query}, changing their worldview.",
#             f"[Plot-Driven] The sequence of cause-and-effect events stemming from {query} creates dramatic tension.",
#             f"[World-Driven] How the physical and social environment enables or constrains {query}.",
#             f"[Theme-Driven] The deeper human truths revealed through the lens of {query}."
#         ]

def process_user_query(llm: StoryForgeLLM, query: str) -> List[dict]:
    """Generate 4 detailed perspectives to clarify the user's story idea and eliminate ambiguity"""
    prompt = f"""The user has provided the following story idea: "{query}"

Generate 4 distinct, detailed perspectives that explore different interpretations of this idea. 
Each perspective should:
1. Be 3-4 sentences long
2. Clearly articulate a unique interpretation
3. Provide concrete details that bring the perspective to life
4. Cover different aspects of storytelling

Use these specific perspective types:
1. Character-Driven: Focus on protagonist's personal journey
2. Plot-Driven: Focus on key events and conflicts  
3. World-Driven: Focus on setting and atmosphere
4. Theme-Driven: Focus on deeper meaning and message

Format each of the 4 perspectives clearly with this exact structure and only output the JSON list:
[
    {{
        "type": "genre_name",
        "icon": "font_awesome_icon",
        "title": "Creative Title",
        "preview": "2-3 sentence atmospheric preview"
    }},
    ...
]
"""

    response = llm.generate(prompt)
    if response.startswith("Error:"):
        print(f"Failed to generate perspectives: {response}")
        return get_fallback_perspectives(query)

    try:
        # Safely evaluate or parse the JSON response
        import json
        perspectives = json.loads(response)

        # Ensure it's a list of 4 dicts with required keys
        if isinstance(perspectives, list) and all(
            isinstance(p, dict) and all(k in p for k in ["type", "icon", "title", "preview"])
            for p in perspectives
        ):
            return perspectives
        else:
            print("Malformed response, falling back.")
            return get_fallback_perspectives(query)

    except Exception as e:
        print(f"Error processing perspectives: {e}")
        return get_fallback_perspectives(query)


def get_fallback_perspectives(query: str) -> List[dict]:
    """Return 4 default perspectives when generation fails"""
    return [
        {
            "type": "fantasy",
            "icon": "fas fa-dragon",
            "title": "Fantasy Quest",
            "preview": f"A mystical journey unfolds as a hero confronts ancient magic sparked by: '{query}'."
        },
        {
            "type": "scifi",
            "icon": "fas fa-rocket",
            "title": "Sci-Fi Paradox",
            "preview": f"Advanced tech collides with human emotion when a discovery about '{query}' threatens the timeline."
        },
        {
            "type": "mystery",
            "icon": "fas fa-magnifying-glass",
            "title": "Twisted Clues",
            "preview": f"An investigator peels back layers of deception after '{query}' leads to a dark secret."
        },
        {
            "type": "theme",
            "icon": "fas fa-brain",
            "title": "Philosophical Reflection",
            "preview": f"'{query}' becomes a lens to explore human nature, destiny, and moral complexity."
        }
    ]


def generate_flash_cards(llm: StoryForgeLLM, memory: StoryMemory, perspective: str) -> Dict[str, Any]:
    """Generate flash cards for a given perspective with robust error handling"""
    prompt = f"""Create detailed flash cards for the following story perspective:

    "{perspective}"

    Generate flash cards with the following sections:
    1. Character Sketches (3 main characters with names, traits, and motivations)
    2. Key Plot Points (5 key events in the story)
    3. World Building (3 important aspects of the setting)
    4. Potential Conflicts (3 major conflicts that could drive the story)

    IMPORTANT: Format the output as a PROPERLY FORMATTED JSON object with these EXACT keys:
    - "characters" (array of strings)
    - "plot_points" (array of strings)
    - "world_building" (array of strings)
    - "conflicts" (array of strings)

    Example:
    {{
        "characters": ["Character 1 description", "Character 2 description"],
        "plot_points": ["Event 1", "Event 2"],
        "world_building": ["Setting aspect 1", "Setting aspect 2"],
        "conflicts": ["Conflict 1", "Conflict 2"]
    }}
    """

    response = llm.generate(prompt, temperature=0.3)
    if response.startswith("Error:"):
        print(f"Failed to generate flash cards: {response}")
        # Provide default flash cards as fallback
        return default_flash_cards(perspective)

    # Clean the response before parsing
    json_str = clean_json_string(response)
    
    try:
        flash_cards = json.loads(json_str)
        
        # Validate the structure
        required_keys = ["characters", "plot_points", "world_building", "conflicts"]
        if not all(key in flash_cards for key in required_keys):
            print("Missing required keys in flash cards")
            missing_keys = [key for key in required_keys if key not in flash_cards]
            # Add missing keys with default values
            for key in missing_keys:
                flash_cards[key] = [f"Default {key.replace('_', ' ')} item"]
        
        # Store in memory with proper metadata
        metadata = {
            "type": "perspective",
            "has_flash_cards": True,
            "timestamp": datetime.now().isoformat()
        }
        
        memory_id = memory.store(perspective, metadata)
        
        # Store flash cards separately
        flash_card_metadata = {
            "type": "flash_cards",
            "related_to": memory_id,
            "perspective": perspective
        }
        memory.store(json.dumps(flash_cards), flash_card_metadata)
        
        return flash_cards
    except Exception as e:
        print(f"Error parsing flash cards: {e}\nOriginal response: {response}")
        return default_flash_cards(perspective)
    
    
def clean_json_string(json_str: str) -> str:
    """Clean and prepare a string for JSON parsing"""
    # Remove markdown code block indicators
    json_str = re.sub(r'```json|```', '', json_str)
    
    # Remove any leading/trailing whitespace
    json_str = json_str.strip()
    
    # Handle cases where the JSON might be nested in explanation text
    if '{' in json_str:
        start_idx = json_str.find('{')
        end_idx = json_str.rfind('}') + 1
        if start_idx >= 0 and end_idx > start_idx:
            json_str = json_str[start_idx:end_idx]
    
    return json_str

def default_flash_cards(perspective: str) -> Dict[str, List[str]]:
    """Generate default flash cards when parsing fails"""
    return {
        "characters": [
            f"Character 1: A protagonist related to {perspective}",
            f"Character 2: An antagonist challenging the protagonist",
            f"Character 3: A supporting character with their own motivations"
        ],
        "plot_points": [
            f"Beginning: Introduction to the world of {perspective}",
            "Rising Action: The protagonist faces initial challenges",
            "Complication: Unexpected obstacles arise",
            "Climax: The protagonist confronts the main conflict",
            "Resolution: The aftermath and consequences"
        ],
        "world_building": [
            f"Setting: The primary location where {perspective} takes place",
            "Social Structure: The hierarchies and relationships in this world",
            "Technology/Magic: Special elements that define this world"
        ],
        "conflicts": [
            "Internal Conflict: The protagonist's personal struggle",
            "Interpersonal Conflict: Tensions between characters",
            "External Conflict: Challenges from the environment or society"
        ]
    }

## 5. Story Bible Generator with improved parsing
def generate_story_bible(llm: StoryForgeLLM, perspective: dict, parameters: dict, importance: dict, original_query: str = '') -> dict:
    """Generate a comprehensive story bible based on the perspective and user parameters
    
    Args:
        llm: The LLM instance to use for generation
        perspective: The selected perspective data
        parameters: User-specified parameters for the story
        importance: Importance weights for different story elements
        original_query: The original user query that started the story
        
    Returns:
        A detailed story bible as a dictionary
    """
    
    # Format a detailed prompt that incorporates all the parameters and importance weights
    prompt = f"""Generate a comprehensive, detailed story bible based on the following perspective and parameters:

ORIGINAL STORY IDEA:
"{original_query}"

SELECTED PERSPECTIVE:
Title: {perspective.get('title', 'Untitled Perspective')}
Type: {perspective.get('type', 'Unknown')}
Description: {perspective.get('preview', 'No description provided')}

USER PARAMETERS:
Genre: {parameters.get('genre', 'fantasy')}
Target Audience: {parameters.get('targetAudience', 'young adult')}
Tone & Mood: {parameters.get('toneAndMood', 'dramatic')}
Story Length: {parameters.get('storyLength', 'medium')}
Complexity (1-5): {parameters.get('complexity', 3)}
Pacing (1-5): {parameters.get('pacing', 3)}
World Building Depth (1-5): {parameters.get('worldBuildingDepth', 3)}
Character Development (1-5): {parameters.get('characterDevelopment', 3)}
Theme Emphasis (1-5): {parameters.get('themeEmphasis', 3)}

ELEMENT IMPORTANCE (1-5):
Characters: {importance.get('charactersImportance', 3)}
Plot: {importance.get('plotImportance', 3)}
World Building: {importance.get('worldBuildingImportance', 3)}
Theme: {importance.get('themeImportance', 3)}
Conflict: {importance.get('conflictImportance', 3)}

Create a story bible that combines the original story idea with the selected perspective, ensuring the narrative maintains the core concept while exploring it through the chosen lens. The story bible should have the following EXACT sections and format:
{{
  "title": "An original and compelling title for the story",
  "tagline": "A catchy one-line description or tagline",
  "premise": "A one-paragraph overview of the complete story concept",
  "theme": "The central theme or message of the story",
  "setting": "A description of the primary setting",
  "tone": "The emotional tone of the narrative",
  "genre": "The primary and secondary genres",
  
  "characters": [
    {{
      "name": "Character name",
      "role": "Protagonist/Antagonist/etc.",
      "traits": "Key personality traits",
      "motivation": "What drives this character",
      "background": "Brief history relevant to the story",
      "arc": "How this character changes over the story"
    }},
    // Include 3-5 major characters with this structure
  ],
  
  "plot": {{
    "act1": "Detailed description of the setup and inciting incident",
    "act2": "Detailed description of the central conflict and challenges",
    "act3": "Detailed description of the climax and resolution",
    "keyEvents": [
      {{
        "title": "Event name",
        "description": "Detailed description of the event and its significance"
      }},
      // Include 5-7 key plot points with this structure
    ]
  }},
  
  "worldBuilding": {{
    "environment": "Description of the physical world",
    "society": "Description of social structures and cultural elements",
    "rules": "Any special rules, magic systems, or technologies",
    "history": "Relevant historical background",
    "locations": [
      {{
        "name": "Location name",
        "description": "Description of the location and its significance"
      }},
      // Include 3-4 key locations with this structure
    ]
  }},
  
  "themes": {{
    "central": [
      {{
        "name": "Theme name",
        "exploration": "How this theme is explored in the story"
      }},
      // Include 2-3 central themes
    ]
  }},
  
  "conflicts": [
    {{
      "type": "Conflict type (e.g., Man vs. Self, Man vs. Nature)",
      "description": "Description of the conflict and its relevance"
    }},
    // Include 2-4 major conflicts
  ]
}}

Based on the importance weights given, put extra emphasis and detail on the elements with higher importance values.
Ensure the story bible is internally consistent and provides a solid foundation for developing a complete narrative.
Format your response EXACTLY as a valid JSON object that strictly follows the structure shown above.
"""

    # Generate the story bible
    response = llm.generate(prompt, temperature=0.7, max_tokens=4000)
    
    if response.startswith("Error:"):
        print(f"Failed to generate story bible: {response}")
        return get_default_story_bible(perspective, parameters)
    
    try:
        # Parse the JSON response
        import json
        json_str = clean_json_string(response)
        story_bible = json.loads(json_str)
        
        # Validate the structure
        required_keys = ["title", "tagline", "premise", "theme", "setting", "tone", "genre", 
                     "characters", "plot", "worldBuilding", "themes", "conflicts"]
        
        # Check for missing keys and add defaults as needed
        if not all(key in story_bible for key in required_keys):
            print("Missing required keys in story bible")
            # Add missing keys with default values from a default story bible
            default_bible = get_default_story_bible(perspective, parameters)
            for key in required_keys:
                if key not in story_bible:
                    story_bible[key] = default_bible[key]
        
        return story_bible
        
    except Exception as e:
        print(f"Error parsing story bible: {e}\nOriginal response: {response}")
        return get_default_story_bible(perspective, parameters)


def get_default_story_bible(perspective, parameters):
    """Create a default story bible if generation fails"""
    title = perspective.get('title', 'Untitled Story')
    genre = parameters.get('genre', 'fantasy')
    
    return {
        "title": title,
        "tagline": f"A {genre} tale of adventure and discovery",
        "premise": f"In this {genre} story, a protagonist embarks on an exciting journey based on: '{perspective.get('preview', 'a unique premise')}'. Through challenges and growth, they discover something profound about themselves and their world.",
        "theme": "Identity and self-discovery",
        "setting": f"A richly very {genre} world with unique cultures and landscapes. Describe in detaile.",
        "tone": parameters.get('toneAndMood', 'dramatic'),
        "genre": parameters.get('genre', 'fantasy'),
        
        "characters": [
            {
                "name": "Protagonist",
                "role": "Main character",
                "traits": "Determined, curious, resourceful",
                "motivation": "To discover their true purpose",
                "background": "Ordinary upbringing with a mysterious heritage",
                "arc": "From self-doubt to self-confidence and purpose"
            },
            {
                "name": "Antagonist",
                "role": "Primary obstacle",
                "traits": "Ambitious, calculating, powerful",
                "motivation": "To maintain control and power",
                "background": "Rose to power through questionable means",
                "arc": "From seemingly invincible to exposed and defeated"
            },
            {
                "name": "Mentor",
                "role": "Guide and teacher",
                "traits": "Wise, experienced, mysterious",
                "motivation": "To prepare the protagonist for their destiny",
                "background": "Has encountered similar challenges in the past",
                "arc": "From reluctant guide to proud teacher"
            }
        ],
        
        "plot": {
            "act1": "Introduction to the protagonist's ordinary world, followed by an inciting incident that disrupts their normal life and forces them to embark on a journey.",
            "act2": "The protagonist faces escalating challenges, makes allies and enemies, learns new skills, and gradually uncovers the true nature of their quest.",
            "act3": "The protagonist confronts the antagonist in a climactic showdown, overcomes their internal and external obstacles, and returns transformed.",
            "keyEvents": [
                {
                    "title": "Inciting Incident",
                    "description": "An unexpected event forces the protagonist out of their comfort zone."
                },
                {
                    "title": "Meeting the Mentor",
                    "description": "The protagonist encounters a wise figure who offers guidance and knowledge."
                },
                {
                    "title": "First Challenge",
                    "description": "The protagonist faces their first significant obstacle and learns an important lesson."
                },
                {
                    "title": "Midpoint Revelation",
                    "description": "A surprising discovery changes the protagonist's understanding of their quest."
                },
                {
                    "title": "Climactic Battle",
                    "description": "The final confrontation between the protagonist and the primary antagonist."
                }
            ]
        },
        
        "worldBuilding": {
            "environment": "A diverse landscape with distinctive natural features that influence the culture and lifestyle of its inhabitants.",
            "society": "A structured society with clear hierarchies, traditions, and customs that the protagonist must navigate.",
            "rules": "Special systems (magic/technology/etc.) that operate according to consistent rules and limitations.",
            "history": "A rich backstory of conflicts, alliances, and legendary figures that continue to influence present events.",
            "locations": [
                {
                    "name": "Protagonist's Home",
                    "description": "The familiar setting that represents comfort and the status quo."
                },
                {
                    "name": "Journey Location",
                    "description": "A challenging environment that tests the protagonist's abilities."
                },
                {
                    "name": "Antagonist's Domain",
                    "description": "The forbidding place where the final confrontation occurs."
                }
            ]
        },
        
        "themes": {
            "central": [
                {
                    "name": "Identity",
                    "exploration": "The protagonist's journey to discover who they truly are and their place in the world."
                },
                {
                    "name": "Power and Responsibility",
                    "exploration": "Examining how characters use their abilities and the consequences of their choices."
                }
            ]
        },
        
        "conflicts": [
            {
                "type": "Character vs. Self",
                "description": "The protagonist's internal struggle to overcome fear, doubt, or other personal limitations."
            },
            {
                "type": "Character vs. Character",
                "description": "The opposition between the protagonist and antagonist, representing conflicting values or goals."
            },
            {
                "type": "Character vs. Society",
                "description": "The protagonist's challenge to navigate or change social expectations and structures."
            }
        ]
    }

## 6. Episode Breakdown with improved parsing
def generate_episode_outlines(llm: StoryForgeLLM, memory: StoryMemory, story_bible: Dict[str, Any], num_episodes: int = 3) -> List[Dict[str, Any]]:
    """Break the story into episodes with robust error handling"""
    # Validate story_bible
    if not story_bible or "synopsis" not in story_bible:
        print("Invalid story bible for episode generation")
        return default_episodes(num_episodes)
    
    # Simplify story bible if it's too complex (to prevent token limits)
    simplified_bible = {
        "synopsis": story_bible.get("synopsis", ""),
        "narrative_arc": story_bible.get("narrative_arc", {"beginning": "", "middle": "", "end": ""}),
        "characters": story_bible.get("characters", [])[:3],  # Limit to 3 characters
        "conflicts": story_bible.get("conflicts", [])[:3]     # Limit to 3 conflicts
    }
    
    prompt = f"""Based on the following Story Bible, divide the narrative into {num_episodes} episodes:

    {json.dumps(simplified_bible, indent=2)}

    For each episode, provide:
    1. Title
    2. Primary Objective (what this episode accomplishes)
    3. Character Focus (which characters are most important)
    4. Key Events (3-5 important things that happen)
    5. Connection to Overall Arc (how this moves the main story forward)

    Format the output as a JSON array where each element is an episode with these keys:
    - "title"
    - "objective"
    - "character_focus" (array of character names)
    - "key_events" (array of event descriptions)
    - "connection_to_arc"
    """

    response = llm.generate(prompt, max_tokens=4000)
    if response.startswith("Error:"):
        print(f"Failed to generate episodes: {response}")
        return default_episodes(num_episodes)

    # Clean the response
    json_str = clean_json_string(response)
    
    try:
        episodes = json.loads(json_str)
        
        # Ensure it's a list
        if not isinstance(episodes, list):
            raise ValueError("Episodes should be a list")
        
        # Validate each episode
        valid_episodes = []
        for i, episode in enumerate(episodes):
            if not isinstance(episode, dict):
                continue
                
            # Ensure required keys exist
            required_keys = ["title", "objective", "character_focus", "key_events", "connection_to_arc"]
            for key in required_keys:
                if key not in episode:
                    if key in ["character_focus", "key_events"]:
                        episode[key] = []
                    else:
                        episode[key] = f"Episode {i+1} {key}"
            
            # Ensure lists are lists
            for key in ["character_focus", "key_events"]:
                if not isinstance(episode[key], list):
                    episode[key] = [episode[key]]
            
            valid_episodes.append(episode)
            
            # Store each episode in memory
            memory.store(
                f"Episode {i+1}: {episode.get('title', 'Untitled')}",
                {"type": "episode", "content": json.dumps(episode)}
            )
        
        # If we lost episodes in validation, create defaults to make up the difference
        while len(valid_episodes) < num_episodes:
            idx = len(valid_episodes)
            valid_episodes.append(default_episodes(1)[0])
        
        return valid_episodes
    except Exception as e:
        print(f"Error parsing episodes: {e}\nOriginal response: {response}")
        return default_episodes(num_episodes)

def default_episodes(num_episodes: int) -> List[Dict[str, Any]]:
    """Generate default episodes when parsing fails"""
    episodes = []
    
    for i in range(num_episodes):
        episode_num = i + 1
        
        if episode_num == 1:
            title = "Beginning"
            objective = "Introduce characters and setting"
            phase = "setup"
        elif episode_num == num_episodes:
            title = "Resolution"
            objective = "Resolve the main conflicts"
            phase = "conclusion"
        else:
            title = f"Development {episode_num}"
            objective = "Advance the plot and develop characters"
            phase = "middle"
            
        episodes.append({
            "title": f"Episode {episode_num}: {title}",
            "objective": objective,
            "character_focus": ["Protagonist", "Supporting Character", "Antagonist"],
            "key_events": [
                f"Event 1: Introduction of {phase} elements",
                f"Event 2: Complication in {phase}",
                f"Event 3: Transition to next phase"
            ],
            "connection_to_arc": f"This episode represents the {phase} phase of the story arc."
        })
    
    return episodes

## 7. Scene Generation with improved parsing
def generate_scene_outline(llm: StoryForgeLLM, episode: Dict[str, Any], scene_number: int) -> Dict[str, Any]:
    """Generate outline for a single scene with robust error handling"""
    # Validate episode
    if not episode or not isinstance(episode, dict):
        print("Invalid episode for scene generation")
        return default_scene_outline(scene_number)
    
    # Get episode details safely
    title = episode.get('title', 'Untitled')
    objective = episode.get('objective', '')
    key_events = episode.get('key_events', [])
    key_events_str = ', '.join(key_events) if isinstance(key_events, list) else str(key_events)
    
    prompt = f"""Create a detailed outline for Scene {scene_number} of the following episode:

    Episode Title: {title}
    Objective: {objective}
    Key Events: {key_events_str}

    The scene outline should include:
    1. Setting (where and when the scene takes place)
    2. Characters Present (who is in the scene)
    3. Purpose (what this scene accomplishes)
    4. Emotional Tone (the mood of the scene)
    5. Key Beats (3-5 important moments in the scene)

    Format the output as a JSON object with these keys:
    - "setting"
    - "characters" (array of character names)
    - "purpose"
    - "tone"
    - "key_beats" (array of beat descriptions)
    """

    response = llm.generate(prompt)
    if response.startswith("Error:"):
        print(f"Failed to generate scene outline: {response}")
        return default_scene_outline(scene_number)

    # Clean the response
    json_str = clean_json_string(response)
    
    try:
        scene_outline = json.loads(json_str)
        
        # Validate structure
        required_keys = ["setting", "characters", "purpose", "tone", "key_beats"]
        for key in required_keys:
            if key not in scene_outline:
                if key in ["characters", "key_beats"]:
                    scene_outline[key] = []
                else:
                    scene_outline[key] = f"Default {key} for scene {scene_number}"
        
        # Ensure lists are lists
        for key in ["characters", "key_beats"]:
            if not isinstance(scene_outline[key], list):
                scene_outline[key] = [scene_outline[key]]
                
        return scene_outline
    except Exception as e:
        print(f"Error parsing scene outline: {e}\nOriginal response: {response}")
        return default_scene_outline(scene_number)

def default_scene_outline(scene_number: int) -> Dict[str, Any]:
    """Generate a default scene outline when parsing fails"""
    return {
        "setting": f"Default setting for scene {scene_number}",
        "characters": ["Character 1", "Character 2"],
        "purpose": f"This scene advances the plot in {scene_number}th direction",
        "tone": "Neutral with elements of tension",
        "key_beats": [
            "Characters enter the scene",
            "Main conversation or action occurs",
            "Scene resolves with a hook to the next scene"
        ]
    }

def generate_full_scene(llm: StoryForgeLLM, memory: StoryMemory, episode: Dict[str, Any], scene_outline: Dict[str, Any]) -> str:
    """Generate the full narrative text for a scene with robust error handling"""
    # Validate inputs
    if not episode or not isinstance(episode, dict) or not scene_outline or not isinstance(scene_outline, dict):
        print("Invalid inputs for scene generation")
        return "The scene unfolds with characters navigating their circumstances, moving the story forward."
    
    # Get episode title safely
    title = episode.get('title', 'Untitled')
    
    prompt = f"""Write the full narrative for a scene in the episode "{title}".

    Scene Outline:
    {json.dumps(scene_outline, indent=2)}

    Write the scene in third-person narrative style, including:
    - Vivid descriptions of the setting
    - Character actions and dialogue
    - Emotional depth
    - Smooth transitions between beats

    The scene should be approximately 500 words.
    """

    scene = llm.generate(prompt, max_tokens=2000)
    if scene.startswith("Error:"):
        print(f"Failed to generate scene: {scene}")
        return "The scene unfolds with characters navigating their circumstances, moving the story forward."

    # Store scene in memory
    try:
        memory.store(
            f"Scene from {title}",
            {
                "type": "scene", 
                "episode": title, 
                "outline": json.dumps(scene_outline), 
                "content": scene
            }
        )
    except Exception as e:
        print(f"Error storing scene in memory: {e}")

    return scene

def generate_all_scenes(llm: StoryForgeLLM, memory: StoryMemory, episode: Dict[str, Any], num_scenes: int = 3) -> List[Dict[str, Any]]:
    """Generate all scenes for an episode with robust error handling"""
    if not episode or not isinstance(episode, dict):
        print("Invalid episode for scene generation")
        return [{"outline": default_scene_outline(i+1), "content": "Default scene content."} for i in range(num_scenes)]
    
    scenes = []
    for i in range(num_scenes):
        try:
            outline = generate_scene_outline(llm, episode, i+1)
            full_scene = generate_full_scene(llm, memory, episode, outline)
            scenes.append({
                "outline": outline,
                "content": full_scene
            })
        except Exception as e:
            print(f"Error generating scene {i+1}: {e}")
            scenes.append({
                "outline": default_scene_outline(i+1),
                "content": "An unexpected error occurred in scene generation."
            })
    
    return scenes

def compile_story(episodes_with_scenes: List[Dict[str, Any]]) -> str:
    """Compile all episodes and scenes into a complete story with error handling"""
    if not episodes_with_scenes:
        return "No story content available."
    
    story = "# COMPLETE STORY\n\n"
    
    try:
        for i, episode_data in enumerate(episodes_with_scenes):
            # Skip invalid episode data
            if not isinstance(episode_data, dict):
                continue
                
            episode = episode_data.get("episode", {})
            scenes = episode_data.get("scenes", [])
            
            if not isinstance(episode, dict) or not isinstance(scenes, list):
                continue
            
            # Episode title
            title = episode.get('title', f'Episode {i+1}')
            story += f"\n\nEPISODE {i+1}: {title}\n"
            story += f"{'=' * 50}\n\n"
            
            # Episode objective
            objective = episode.get('objective', '')
            if objective:
                story += f"Objective: {objective}\n\n"
            
            # Scenes
            for j, scene in enumerate(scenes):
                if not isinstance(scene, dict):
                    continue
                    
                outline = scene.get('outline', {})
                content = scene.get('content', '')
                
                story += f"\nScene {j+1}\n"
                story += f"{'-' * 30}\n"
                
                # Scene details from outline
                if isinstance(outline, dict):
                    setting = outline.get('setting', '')
                    characters = outline.get('characters', [])
                    tone = outline.get('tone', '')
                    
                    if setting:
                        story += f"Setting: {setting}\n"
                    if characters:
                        story += f"Characters: {', '.join(characters)}\n"
                    if tone:
                        story += f"Tone: {tone}\n"
                
                story += "\n"
                
                # Scene content
                if content:
                    story += content + "\n"
                else:
                    story += "[Scene content missing]\n"
    
    except Exception as e:
        print(f"Error compiling story: {e}")
        story += "\n\n[Error occurred during story compilation. Partial content shown.]"
    
    return story

## 9. Image Generation Module
def generate_story_image(prompt: str, size: str = "1024x1024", model: str = "dall-e-3") -> str:
    """Generate an image for a story scene with error handling"""
    if not openai_client:
        print("OpenAI client not available for image generation")
        return ""
    
    try:
        response = openai_client.images.generate(
            model=model,
            prompt=f"A high-quality illustration for a story: {prompt}",
            size=size,
            quality="hd",
            n=1
        )
        return response.data[0].url
    except Exception as e:
        print(f"Error generating image: {e}")
        return ""


## 10. Main Pipeline with comprehensive error handling
def storyforge_pipeline(user_query: str) -> Dict[str, Any]:
    """Complete StoryForge pipeline from query to finished story with robust error handling"""
    print("Starting StoryForge pipeline...")
    
    # Initialize components
    llm = StoryForgeLLM()
    memory = StoryMemory()
    
    result = {
        "success": False,
        "error": None,
        "perspectives": [],
        "flash_cards": [],
        "story_bible": {},
        "episodes": [],
        "full_story": "",
        "cover_image_url": "",
        "consistency_check": []
    }
    
    try:
        # 1. Process user query
        print("\n1. Generating perspectives...")
        perspectives = process_user_query(llm, user_query)
        result["perspectives"] = perspectives

        print(f"Generated {len(perspectives)} perspectives:")
        for i, p in enumerate(perspectives, start=1):
            print(f"\nPerspective {i}:")
            print(f"  Type   : {p['type']}")
            print(f"  Icon   : {p['icon']}")
            print(f"  Title  : {p['title']}")
            print(f"  Preview: {p['preview']}")

        # 2. Generate flash cards for each perspective
        print("\n2. Creating flash cards...")
        flash_cards_list = []
        for perspective in perspectives:
            try:
                flash_cards = generate_flash_cards(llm, memory, perspective)
                flash_cards_list.append(flash_cards)
            except Exception as e:
                print(f"Error generating flash cards for perspective '{perspective[:50]}...': {e}")
                flash_cards_list.append(default_flash_cards(perspective))
        result["flash_cards"] = flash_cards_list
        print(flash_cards_list)
        exit()
        # 3. Generate story bible
        print("\n3. Creating Story Bible...")
        story_bible = generate_story_bible(llm, memory, flash_cards_list, user_query)
        result["story_bible"] = story_bible
        print("Story Bible created with:")
        print(f"- Synopsis: {story_bible.get('synopsis', '')[:100]}...")
        print(f"- {len(story_bible.get('characters', []))} characters")
        print(f"- {len(story_bible.get('settings', []))} settings")
        
        # 4. Break into episodes
        print("\n4. Breaking story into episodes...")
        episodes = generate_episode_outlines(llm, memory, story_bible)
        result["episodes"] = episodes
        print(f"Generated {len(episodes)} episodes:")
        for ep in episodes:
            print(f"- {ep.get('title', 'Untitled')}")
        
        # 5. Generate scenes for each episode
        print("\n5. Generating scenes for each episode...")
        episodes_with_scenes = []
        for episode in episodes:
            try:
                scenes = generate_all_scenes(llm, memory, episode)
                episodes_with_scenes.append({
                    "episode": episode,
                    "scenes": scenes
                })
                print(f"- Generated {len(scenes)} scenes for {episode.get('title', 'Untitled')}")
            except Exception as e:
                print(f"Error generating scenes for episode: {e}")
                episodes_with_scenes.append({
                    "episode": episode,
                    "scenes": [{"outline": default_scene_outline(1), "content": "Scene generation failed"}]
                })
        
        # 6. Compile final story
        print("\n6. Compiling final story...")
        full_story = compile_story(episodes_with_scenes)
        result["full_story"] = full_story
        
        # 7. Generate cover image
        print("\n7. Generating cover image...")
        cover_prompt = f"Cover art for a story about: {user_query}"
        cover_image_url = generate_story_image(cover_prompt)
        result["cover_image_url"] = cover_image_url
        
        # 8. Retrieve relevant memories for consistency check
        print("\n8. Performing consistency check...")
        consistency_check = memory.retrieve("character traits", k=5)
        result["consistency_check"] = consistency_check
        print(f"Retrieved {len(consistency_check)} relevant memories for consistency")
        
        result["success"] = True
    
    except Exception as e:
        print(f"\nFatal error in StoryForge pipeline: {e}")
        result["error"] = str(e)
        traceback.print_exc()
    
    return result

def generate_episode(prompt):
    """
    Generate a detailed story episode using GPT.
    
    Args:
        prompt: A detailed prompt for episode generation
        
    Returns:
        str: The full episode text with title and content
    """
    llm = StoryForgeLLM()
    
    try:
        print(f"Generating episode with prompt length: {len(prompt)} characters")
        response = llm.generate(
            prompt=prompt,
            temperature=0.7,  # Creative but not too random
            max_tokens=4000   # Enough for a detailed episode
        )
        
        if not response or response.startswith("Error:"):
            print(f"LLM generation error: {response}")
            return "EPISODE TITLE: Error Episode\n\nUnable to generate episode content. Please try again."
            
        # Ensure the episode ends with a hook
        if not any(hook_phrase in response.lower() for hook_phrase in ["to be continued", "what happens next", "little did they know", "but that was just the beginning"]):
            # Add a hook if one isn't present
            response += "\n\n[To be continued...]"
            
        print(f"Successfully generated episode response with length: {len(response)} characters")
        return response
    except Exception as e:
        print(f"Error in generate_episode: {str(e)}")
        traceback.print_exc()  # More detailed error information
        return f"EPISODE TITLE: Error Occurred\n\nAn error occurred during episode generation: {str(e)}"