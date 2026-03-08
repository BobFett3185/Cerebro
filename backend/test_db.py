import asyncio
import uuid
import datetime
from config import get_database, close_mongo_connection

async def test_insertion():
    try:
        db = get_database()
        print("Connecting to MongoDB...")
        
        test_collection = db["test_connection"]
        random_str = f"HackAI_Test_{uuid.uuid4().hex[:8]}"
        
        doc = {
            "message": "Connection verified by Antigravity",
            "random_string": random_str,
            "timestamp": datetime.datetime.now(datetime.timezone.utc)
        }
        
        result = await test_collection.insert_one(doc)
        print(f"Successfully inserted document with ID: {result.inserted_id}")
        print(f"Random string added: {random_str}")
        
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_insertion())
