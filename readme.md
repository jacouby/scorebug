# Medford Scorebug

Simple localhosted web-based scorebug

## Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js & npm

### Initial Setup

1. Clone the repository:
```bash
git clone //TODO ADD LINK
cd 
```

2. Create and activate a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
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

## - TODO

- [ ] Custom Text in middle for current quater/down
- [X] Timeout (Make banner stay until manual change)
- [X] PopUps by Team
- [x] Replace entire overlay with given text in specific color/text
