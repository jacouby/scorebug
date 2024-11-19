from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import json
from typing import Dict, List
import os
import sys

app = FastAPI()

def get_resource_path(relative_path):
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    
    return os.path.join(base_path, relative_path)

# Mount static files with the correct path
static_path = get_resource_path('static')
print(f"Mounting static files from: {static_path}")  # Debug print
app.mount("/static", StaticFiles(directory=static_path), name="static")

# Default state
DEFAULT_STATE = {
    "time": {
        "activated": False,
        "gameTime": "00:00"
    },
    "home": {
        "name": "Home Team",
        "score": 0,
        "color": "#1303c8"
    },
    "away": {
        "name": "Away Team",
        "score": 0,
        "color": "#ff0000"
    }
}

# Store current state
current_state = DEFAULT_STATE.copy()

# Store connected clients
class ConnectionManager:
    def __init__(self):
        self.overlay_clients: List[WebSocket] = []
        self.control_clients: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, client_type: str):
        await websocket.accept()
        if client_type == "control":
            self.control_clients.append(websocket)
            # Send current state to new control client
            await websocket.send_text(json.dumps(current_state))
        else:
            self.overlay_clients.append(websocket)
            # Send current state to new overlay client
            await websocket.send_text(json.dumps(current_state))

    def disconnect(self, websocket: WebSocket, client_type: str):
        if client_type == "control":
            self.control_clients.remove(websocket)
        else:
            self.overlay_clients.remove(websocket)

    async def broadcast_to_overlays(self, message: str):
        for client in self.overlay_clients:
            try:
                await client.send_text(message)
            except:
                # Remove failed clients
                self.overlay_clients.remove(client)

manager = ConnectionManager()

# Helper function to read HTML content
def read_html(filename: str) -> str:
    try:
        file_path = get_resource_path(filename)
        print(f"Reading file from: {file_path}")  # Debug print
        with open(file_path, "r", encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Error reading file {filename}: {str(e)}")  # Debug print
        raise HTTPException(status_code=500, detail=f"Could not read {filename}")

# Serve the overlay.html file
@app.get("/overlay")
async def get_overlay():
    html_content = read_html("overlay.html")
    return HTMLResponse(content=html_content, media_type="text/html")

# Serve the control.html file
@app.get("/control")
async def get_control():
    html_content = read_html("control.html")
    return HTMLResponse(content=html_content, media_type="text/html")

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    client_type: str = Query("overlay")
):
    await manager.connect(websocket, client_type)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("command") == "reset":
                    global current_state
                    current_state = DEFAULT_STATE.copy()
                    if client_type == "control":
                        await websocket.send_text(json.dumps(current_state))
                        await manager.broadcast_to_overlays(json.dumps(current_state))
                elif message.get("command") in ["banner", "persistent_banner"]:
                    if client_type == "control":
                        await manager.broadcast_to_overlays(json.dumps(message))
                elif message.get("command") == "remove_banner":
                    if client_type == "control":
                        await manager.broadcast_to_overlays(json.dumps(message))
                elif all(key in message for key in ["time", "home", "away"]):
                    if client_type == "control":
                        # Update current state
                        current_state = message
                        # Broadcast the message to all overlay clients
                        await manager.broadcast_to_overlays(json.dumps(message))
                else:
                    if client_type == "control":
                        await websocket.send_text("Missing required fields")
            except json.JSONDecodeError:
                if client_type == "control":
                    await websocket.send_text("Invalid JSON received")
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_type)
        print(f"WebSocket connection closed for {client_type}")

#if __name__ == "__main__":
#    # Run the server
#    os.system("uvicorn server:app --reload")
