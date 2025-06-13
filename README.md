# BendDash - Databend Log Observer Platform

A professional-grade log observation platform for Databend that provides unified monitoring and analysis of system logs, query history, and execution profiles.

## Core Features

 **Unified Log Analysis** - Join three system tables for complete visibility  
 **Real-time Metrics Dashboard** - Total logs, error rate, average query time  
 **Advanced Filtering** - Time range, log level, component, query ID search  
 **Professional UI** - Dark theme, responsive design, tabbed navigation  
 **Detailed Analysis** - Overview, query, profile, timeline views  

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Test connection
python test.py "databend://user:pass@host:port/db"

# Start application
python start.py --dsn "databend://user:pass@host:port/db"

# Access interface
open http://localhost:5000
```

## Project Structure

```
benddash/
├── app.py              # Flask main application
├── start.py            # Startup script
├── test.py             # Connection test
├── config.py           # Configuration file
├── templates/
│   └── index.html      # Main page template
├── static/
│   ├── style.css       # Stylesheet
│   └── script.js       # Frontend logic
└── queries/
    └── query.sql       # SQL query template
```

## Core SQL Query

Joins three system tables:
- `system_history.log_history` - Raw logs
- `system_history.query_history` - Query details  
- `system_history.profile_history` - Execution profiles

## API Endpoints

- `GET /` - Main page
- `POST /api/logs` - Get filtered logs
- `GET /api/metrics` - Get dashboard metrics
- `POST /api/connect` - Connect to database
- `POST /api/query` - Execute custom query

---

Professional-grade log observation platform designed for Databend, making system monitoring simple and efficient.
