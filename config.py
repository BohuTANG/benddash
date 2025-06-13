# Databend Log Observer Configuration
# Copy this file to config.py and update with your settings

# Databend Connection Settings
DATABEND_DSN = "databend://username:password@hostname:port/database"

# Example DSNs:
# Local development: "databend://root@localhost:8000/default"
# Cloud instance: "databend://user:pass@cloud.databend.com:443/production"

# Web Server Settings
HOST = "0.0.0.0"  # Bind to all interfaces
PORT = 5001       # Web server port
DEBUG = False     # Set to True for development

# Log Observer Settings
DEFAULT_TIME_RANGE = "24h"  # Default time range for log queries
MAX_LOG_ENTRIES = 1000      # Maximum number of log entries to return
REFRESH_INTERVAL = 30       # Auto-refresh interval in seconds

# UI Settings
THEME = "dark"              # UI theme (currently only dark supported)
ITEMS_PER_PAGE = 50         # Number of items per page in tables

# Security Settings (for future use)
SECRET_KEY = "your-secret-key-here"  # Change this in production
ENABLE_AUTH = False                  # Enable authentication (future feature)

# Logging Settings
LOG_LEVEL = "INFO"          # Application log level
LOG_FILE = "log_observer.log"  # Log file path
