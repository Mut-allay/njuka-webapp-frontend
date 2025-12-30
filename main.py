import sys
import os

# Add the backend directory to sys.path so we can import main
# absolute path to 'backend/njuka-webapp-backend'
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend', 'njuka-webapp-backend'))
sys.path.append(backend_path)

if __name__ == "__main__":
    print(f"Added {backend_path} to sys.path")

try:
    from main import app
except ImportError as e:
    print(f"Error importing app: {e}")
    # Fallback/Debug info
    print("sys.path:", sys.path)
    raise e
