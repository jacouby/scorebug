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

### Running Tailwind CSS in Watch Mode
In a separate terminal:
```bash
npx tailwindcss -i ./static/global.css -o ./static/output.css --watch
```

This will:
- Watch for changes in your HTML and CSS files
- Automatically rebuild the CSS when changes are detected
- Hot-reload styles in the browser

## Production Mode

### Building CSS for Production
```bash
npx tailwindcss -i ./static/global.css -o ./static/output.css --minify
```

### Running in Production
```bash
fastapi run
```

## Important Notes

1. In development, always run both the FastAPI server and Tailwind CSS watcher
2. For production, build the CSS file before deploying
3. Make sure the `static` directory is properly served by FastAPI
4. The Poppins font family is included in the project and served locally