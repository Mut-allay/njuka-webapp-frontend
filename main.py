import sys
import os
import importlib.util

# Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend', 'njuka-webapp-backend')
backend_main_path = os.path.join(backend_dir, 'main.py')

# Add backend directory to sys.path so it can find its own dependencies if any (though it seems self-contained)
sys.path.append(backend_dir)

# Use importlib to load the module with a specific name to avoid collision with this 'main.py'
spec = importlib.util.spec_from_file_location("backend_app_module", backend_main_path)
backend_module = importlib.util.module_from_spec(spec)
sys.modules["backend_app_module"] = backend_module
spec.loader.exec_module(backend_module)

# Expose the app object
app = backend_module.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
