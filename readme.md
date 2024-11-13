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

4. Install Tailwind CSS:
```bash
npm install -D tailwindcss
npx tailwindcss init
```

## Development Mode

### Running the FastAPI Server
```bash
fastapi dev
```
The server will be available at `http://localhost:8000`

This will:
- Watch for changes in your HTML and CSS files

### Running in Production
```bash
fastapi run
```

## TODO

Quarter/In place of time
Make specific  box with score
Current Down
Timeout
Flag
Replace entire overlay with given text in specific color/text
