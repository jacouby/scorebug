from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import json
from typing import Dict, List, Optional
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
        "activated": True,
        "gameTime": "@"
    },
    "home": {
        "name": "Home",
        "subtext": "Team",
        "score": 0,
        "color": "#1303c8"
    },
    "away": {
        "name": "Away",
        "subtext": "Team",
        "score": 0,
        "color": "#ff0000"
    },
    "popup": {
        "active": False,
        "text": "",
        "team": "",
        "timestamp": None
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

# Add new class to track popup state
class PopupState:
    def __init__(self):
        self.active_popup: Optional[dict] = None

popup_manager = PopupState()

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
                command = message.get("command")
                
                if command == "reset":
                    global current_state
                    current_state = DEFAULT_STATE.copy()
                    popup_manager.active_popup = None
                    if client_type == "control":
                        await websocket.send_text(json.dumps(current_state))
                        await manager.broadcast_to_overlays(json.dumps(current_state))
                
                elif command in ["banner", "persistent_banner"]:
                    if client_type == "control":
                        await manager.broadcast_to_overlays(json.dumps(message))
                
                elif command in ["popup", "persistent_popup"]:
                    if client_type == "control":
                        if popup_manager.active_popup is None:
                            popup_manager.active_popup = message
                            # Send confirmation to control client
                            await websocket.send_text(json.dumps({
                                "status": "success",
                                "message": "Popup activated",
                                "popup_data": message
                            }))
                            # Broadcast to overlay clients
                            await manager.broadcast_to_overlays(json.dumps(message))
                        else:
                            # Send error to control client
                            await websocket.send_text(json.dumps({
                                "status": "error",
                                "message": "A popup is already active"
                            }))
                
                elif command == "remove_popup":
                    if client_type == "control":
                        popup_manager.active_popup = None
                        # Send confirmation to control client
                        await websocket.send_text(json.dumps({
                            "status": "success",
                            "message": "Popup removed"
                        }))
                        # Broadcast to overlay clients
                        await manager.broadcast_to_overlays(json.dumps(message))
                
                elif command == "remove_banner":
                    if client_type == "control":
                        await manager.broadcast_to_overlays(json.dumps(message))
                
                elif all(key in message for key in ["time", "home", "away"]):
                    if client_type == "control":
                        current_state = message
                        await manager.broadcast_to_overlays(json.dumps(message))
                
                else:
                    if client_type == "control":
                        await websocket.send_text(json.dumps({
                            "status": "error",
                            "message": "Missing required fields"
                        }))
                        
            except json.JSONDecodeError:
                if client_type == "control":
                    await websocket.send_text(json.dumps({
                        "status": "error",
                        "message": "Invalid JSON received"
                    }))
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_type)
        print(f"WebSocket connection closed for {client_type}")

#if __name__ == "__main__":
#    # Run the server
#    os.system("uvicorn server:app --reload")
