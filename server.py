from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, Response, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import json
from typing import Dict, List, Optional
import os
import sys
import copy  # Added for deep copying the default state

app = FastAPI()

ENABLE_CONTROLS = True  # Set to False to disable control endpoints

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
        "color": "#1303c8",
        "logo": None
    },
    "away": {
        "name": "Away",
        "subtext": "Team",
        "score": 0,
        "color": "#ff0000",
        "logo": None
    },
    "popup": {
        "active": False,
        "text": "",
        "team": "",
        "timestamp": None
    }
}
# Store current state using a deep copy to ensure nested dictionaries are reinitialized
current_state = copy.deepcopy(DEFAULT_STATE)

# Store connected clients
class ConnectionManager:
    def __init__(self):
        self.clientList: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, client_type: str):
        await websocket.accept()
        self.clientList.append(websocket)
        # Send current state to new overlay client
        await websocket.send_text(json.dumps(current_state))

    def disconnect(self, websocket: WebSocket, client_type: str):
        self.clientList.remove(websocket)

    async def broadcastToClients(self, message: str):
        print(f"Broadcasting message to clients: {message}")
        for client in self.clientList:
            try:
                await client.send_text(message)
            except Exception as e:
                self.clientList.remove(client)

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

@app.get("/bboverlay")
async def get_control():
    html_content = read_html("bbOverlay.html")
    return HTMLResponse(content=html_content, media_type="text/html")

# Serve the control.html file
@app.get("/control")
async def get_control():
    if not ENABLE_CONTROLS:
        raise HTTPException(status_code=403, detail="Control access is disabled")
    html_content = read_html("control.html")
    return HTMLResponse(content=html_content, media_type="text/html")

@app.get("/mobileControl")
async def get_control():
    if not ENABLE_CONTROLS:
        raise HTTPException(status_code=403, detail="Control access is disabled")
    html_content = read_html("mobileControl.html")
    return HTMLResponse(content=html_content, media_type="text/html")

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    client_type: str = Query("overlay")
):
    if not ENABLE_CONTROLS and client_type == "control":
        await websocket.close(code=1008, reason="Control access is disabled")
        return
    
    await manager.connect(websocket, client_type)
    print(f"New {client_type} client connected")  # Debug print
    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received data from {client_type} client: {data}")  # Debug print
            try:
                message = json.loads(data)
                command = message.get("command")
                
                if command == "reset":
                    global current_state
                    current_state = copy.deepcopy(DEFAULT_STATE)
                    popup_manager.active_popup = None
                    if client_type == "control":
                        await websocket.send_text(json.dumps(current_state))
                        await manager.broadcastToClients(json.dumps(current_state))
                
                elif command in ["banner", "persistent_banner"]:
                    if client_type == "control":
                        await manager.broadcastToClients(json.dumps(message))
                
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
                            await manager.broadcastToClients(json.dumps(message))
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
                        await manager.broadcastToClients(json.dumps(message))
                
                elif command == "remove_banner":
                    if client_type == "control":
                        await manager.broadcastToClients(json.dumps(message))
                
                elif all(key in message for key in ["time", "home", "away"]):
                    if client_type == "control":
                        current_state = message
                        await manager.broadcastToClients(json.dumps(message))
                
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
        print(f"{client_type} client disconnected")

@app.get('/reset')
async def reset_score():
    global current_state
    current_state = copy.deepcopy(DEFAULT_STATE)
    await manager.broadcastToClients(json.dumps(current_state))

@app.get("/time/set")
async def update_score(text: str):
    current_state['time']["gameTime"] = text
    print(current_state)
    await manager.broadcastToClients(json.dumps(current_state))
    return {"gameTime": current_state['time']["gameTime"]}

# Add these new endpoints after the existing routes
@app.get("/{team}/score")
async def update_score(team: str, value: int):
    if team not in ["home", "away"]:
        raise HTTPException(status_code=400, detail="Invalid team specified")
    
    current_state[team]["score"] = max(0, current_state[team]["score"] + value)
    await manager.broadcastToClients(json.dumps(current_state))
    return {"score": current_state[team]["score"]}

@app.get("/{team}/name")
async def team_name(team: str, change: bool = False, name: Optional[str] = None):
    if team not in ["home", "away"]:
        raise HTTPException(status_code=400, detail="Invalid team specified")
    
    if change and name is not None:
        current_state[team]["name"] = name
        await manager.broadcastToClients(json.dumps(current_state))
        
    return {"name": current_state[team]["name"]}

@app.get("/{team}/color")
async def team_color(team: str, change: bool = False, hex: Optional[str] = None):
    if team not in ["home", "away"]:
        raise HTTPException(status_code=400, detail="Invalid team specified")
    
    if change and hex is not None:
        current_state[team]["color"] = hex
        await manager.broadcastToClients(json.dumps(current_state))
        
    return {"color": current_state[team]["color"]}

@app.get("/{team}/subtext")
async def team_subtext(team: str, change: bool = False, subtext: Optional[str] = None):
    if team not in ["home", "away"]:
        raise HTTPException(status_code=400, detail="Invalid team specified")
    
    if change and subtext is not None:
        current_state[team]["subtext"] = subtext
        await manager.broadcastToClients(json.dumps(current_state))
        
    return {"subtext": current_state[team]["subtext"]}

@app.get("/{team}/shot_clock")
async def update_shot_clock(team: str, value: int):
    if team not in ["home", "away"]:
        raise HTTPException(status_code=400, detail="Invalid team specified")
    
    current_state[team]["shot_clock"] = max(0, value)  # Update shot clock
    await manager.broadcastToClients(json.dumps(current_state))
    return {"shot_clock": current_state[team]["shot_clock"]}

@app.get("/{team}/custom_text")
async def update_custom_text(team: str, text: str):
    if team not in ["home", "away"]:
        raise HTTPException(status_code=400, detail="Invalid team specified")
    
    current_state[team]["custom_text"] = text  # Update custom text
    await manager.broadcastToClients(json.dumps(current_state))
    return {"custom_text": current_state[team]["custom_text"]}

@app.get("/state")
async def get_state():
    return {
        "time": {
            "activated": True,
            "gameTime": current_state["time"]["gameTime"],
        },
        "home": current_state["home"],
        "away": current_state["away"]
    }

@app.post("/{team}/logo")
async def team_logo(team: str, request: Request):
    if team not in ["home", "away"]:
        raise HTTPException(status_code=400, detail="Invalid team specified")
    
    data = await request.json()
    logo = data.get("logo")
    
    if logo:
        current_state[team]["logo"] = logo
        await manager.broadcastToClients(json.dumps(current_state))
        return {"message": "Logo updated successfully"}
    else:
        raise HTTPException(status_code=400, detail="Logo data is missing")

#if __name__ == "__main__":
#    # Run the server
#    os.system("uvicorn server:app --reload")
