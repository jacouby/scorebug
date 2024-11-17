import webview
import threading
import uvicorn
from server import app  # Import your FastAPI app

def start_server():
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == '__main__':
    # Start the FastAPI server in a separate thread
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()

    # Create a webview window
    webview.create_window('Control UI', 'http://localhost:8000/control.html')
    webview.start() 