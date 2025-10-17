# Scorebug

Simple localhosted web-based scorebug

## Setup & Installation

### Prerequisites
- Python 3.12+

### Initial Setup

1. Clone the repository:
```bash
git clone https://github.com/jacouby/scoreubg.git
cd scorebug
```

2. Create and activate a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Or On Windows, use: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

### Development Mode
```bash
fastapi dev
```
The server will be available at `http://localhost:8000`

### Running in Production
```bash
fastapi run
```


## Accessing the service

### `GET /overlay`
Serves the overlay.html page

### `GET /bboverlay`
Serves the bboverlay.html page, Smaller version of the overlay.

### `GET /control`
Serves the control.html page

### `GET /mobileControl`
Serves the mobileControl.html page (Stripped Down, Score Control only)

## API

***Any varibles below mentioned as {team} are expected to be either `home` or `away`***

### `WS /ws`
Websocket Server, only sends out info

### `GET /reset`
Resets the current state to default

### `GET /state`
Returns the current state

### `GET /time/set`
Sets middle text
Query Params:
- `text` (string)
  - The text to set middle text to

### `GET /{team}/name`
Returns the given team's current set `name`.
Query Params:
- `change` (bool, optional)
  - `false` (default) = ignores any other params
  - `true` = allows change of set name
- `name` (string, optional)
  - The name to change to if `change` is set to `true`

### `GET /{team}/subtext`
Returns the given team's current set `subtext/subname`.
Query Params:
- `change` (bool, optional)
  - `false` (default) = ignores any other params
  - `true` = allows change of set name
- `subtext` (string, optional)
  - The subtext/subname to change to if `change` is set to `true`

### `GET /{team}/color`
Returns the given team's current set `color`.
Query Params:
- `change` (bool, optional)
  - `false` (default) = ignores any other params
  - `true` = allows change of set name
- `hex` (string, optional)
  - The hex code to set to if `change` is set to `true`

### `GET /{team}/score`
Returns or changes the given team's current set `score`.
Query Params:
- `value` (int, optional)
  - The value to add to current score

### `POST /{team}/logo`
Returns or changes the given team's current set `logo`.
Body Params
- `logo`
  - Base64 encoded image, square png expected

# Licenese

Copyright 2024-2025 Jacob Yee

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
