import json
import time
import traceback
from typing import Dict, Any
from storyforge import storyforge_pipeline
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Load environment variables
load_dotenv()

def fetch_query_from_database() -> str:
    try:
        mongodb_uri = "mongodb+srv://nishant:11@cluster0.ukbxd0c.mongodb.net/storyforge?retryWrites=true&w=majority&appName=Cluster0"
        client = MongoClient(mongodb_uri)
        db = client.storyforge
        inputs = db.inputs

        latest_input = inputs.find_one({}, sort=[("createdAt", -1)])  # Fix is here

        if latest_input and 'prompt' in latest_input and 'text' in latest_input['prompt']:
            inputs.update_one(
                {"_id": latest_input["_id"]},
                {"$set": {"status": "processing", "processing_started": datetime.utcnow()}}
            )
            return latest_input['prompt']['text']
        else:
            return "No inputs found."

    except Exception as e:
        print(f"Error fetching query from database: {e}")
        return "Error fetching story request from database."

    finally:
        if 'client' in locals():
            client.close()

def save_results_to_database(results: Dict[str, Any], input_id) -> None:
    """
    Save the pipeline results to the database and reset the input status.
    """
    try:
        # Connect to MongoDB using connection string from environment variable
        mongodb_uri = "mongodb+srv://nishant:11@cluster0.ukbxd0c.mongodb.net/storyforge?retryWrites=true&w=majority&appName=Cluster0"
        client = MongoClient(mongodb_uri)
        db = client.storyforge
        inputs = db.inputs

        # Reset the status to "draft" after processing
        inputs.update_one(
            {"_id": input_id},
            {"$set": {"status": "draft", "updatedAt": datetime.utcnow()}}
        )

        print("Results saved and status reset to draft.")
        print(json.dumps(results, indent=2))

    except Exception as e:
        print(f"Error saving results to database: {e}")
    finally:
        if 'client' in locals():
            client.close()

def main():
    try:
        # Fetch query from database
        print("\nFetching query from database...")
        user_query = fetch_query_from_database()
        print(f"Query received: {user_query}")
        if user_query == "No inputs found.":
            return

        # Run the pipeline
        print("\nRunning StoryForge pipeline...")
        start_time = time.time()
        result = storyforge_pipeline(user_query)
        elapsed_time = time.time() - start_time
        print(result)
        print(elapsed_time)
        exit()
        # Save results to database and reset status
        save_results_to_database(result, latest_input["_id"])

        print("\nPipeline completed!")
        print(f"Total execution time: {elapsed_time:.2f} seconds")

        if result.get("success"):
            print("\nResults:")
            print(f"- Generated {len(result['episodes'])} episodes")
            print(f"- Full story length: {len(result['full_story'])} characters")
            if result.get("cover_image_url"):
                print(f"- Cover image URL: {result['cover_image_url']}")

            print("\nSample from the story:")
            print(result['full_story'][:500] + "...")
        else:
            print("\nPipeline failed with error:")
            print(result.get("error", "Unknown error"))

    except KeyboardInterrupt:
        print("\nPipeline interrupted by user")
    except Exception as e:
        print(f"\nFatal error in main execution: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main() 