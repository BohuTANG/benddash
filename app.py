from flask import Flask, render_template, request, jsonify, session
from database import DatabendClient, LogRepository, MetricsRepository, QueryRepository
import os
import argparse
import json
from urllib.parse import urlparse
import uuid
import secrets

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# Global variables for database components (when using global mode)
global_db_client = None
global_log_repo = None
global_metrics_repo = None
global_query_repo = None
global_connection_status = {"connected": False, "error": None, "dsn_masked": None}

# Session-based connections storage
session_connections = {}

# DSN configuration file path
DSN_CONFIG_FILE = os.path.join(os.path.dirname(__file__), '.dsn_config.json')

def get_session_id():
    """Get or create session ID"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return session['session_id']

def mask_dsn(dsn):
    """Mask sensitive information in DSN string"""
    if not dsn:
        return None
    
    try:
        # Parse DSN format: databend://username:password@host:port/database?params
        if '://' in dsn:
            protocol, rest = dsn.split('://', 1)
            if '@' in rest:
                credentials, host_part = rest.split('@', 1)
                if ':' in credentials:
                    username, password = credentials.split(':', 1)
                    # Mask password
                    masked_password = '*' * len(password) if password else ''
                    masked_credentials = f"{username}:{masked_password}"
                else:
                    masked_credentials = credentials
                return f"{protocol}://{masked_credentials}@{host_part}"
        return dsn
    except Exception:
        # If parsing fails, just mask the middle part
        if len(dsn) > 20:
            return dsn[:10] + '*' * (len(dsn) - 20) + dsn[-10:]
        return '*' * len(dsn)

def save_dsn_config(dsn):
    """Save DSN configuration to file (only for global mode)"""
    try:
        config = {'dsn': dsn}
        with open(DSN_CONFIG_FILE, 'w') as f:
            json.dump(config, f)
    except Exception as e:
        print(f"Failed to save DSN config: {e}")

def load_dsn_config():
    """Load DSN configuration from file (only for global mode)"""
    try:
        if os.path.exists(DSN_CONFIG_FILE):
            with open(DSN_CONFIG_FILE, 'r') as f:
                config = json.load(f)
                return config.get('dsn')
    except Exception as e:
        print(f"Failed to load DSN config: {e}")
    return None

def initialize_global_database(dsn):
    """Initialize global database connection and repositories."""
    global global_db_client, global_log_repo, global_metrics_repo, global_query_repo, global_connection_status
    
    try:
        global_db_client = DatabendClient(dsn)
        
        # Test connection with a query that actually starts the warehouse
        test_query = "SELECT sum(number) FROM numbers(10)"
        rows, columns, error = global_db_client.execute_query(test_query)
        if error:
            raise Exception(f"Connection test failed: {error}")
        
        global_log_repo = LogRepository(global_db_client)
        global_metrics_repo = MetricsRepository(global_db_client)
        global_query_repo = QueryRepository(global_db_client)
        global_connection_status = {
            "connected": True,
            "error": None,
            "dsn_masked": mask_dsn(dsn)
        }
        print("Global database connection established successfully")
        return True
    except Exception as e:
        global_connection_status = {
            "connected": False,
            "error": str(e),
            "dsn_masked": None
        }
        print(f"Failed to connect to global database: {e}")
        return False

def initialize_session_database(session_id, dsn):
    """Initialize session-specific database connection and repositories."""
    try:
        db_client = DatabendClient(dsn)
        
        # Test connection with a query that actually starts the warehouse
        test_query = "SELECT sum(number) FROM numbers(10)"
        rows, columns, error = db_client.execute_query(test_query)
        if error:
            raise Exception(f"Connection test failed: {error}")
        
        log_repo = LogRepository(db_client)
        metrics_repo = MetricsRepository(db_client)
        query_repo = QueryRepository(db_client)
        
        session_connections[session_id] = {
            "db_client": db_client,
            "log_repo": log_repo,
            "metrics_repo": metrics_repo,
            "query_repo": query_repo,
            "connection_status": {
                "connected": True,
                "error": None,
                "dsn_masked": mask_dsn(dsn)
            }
        }
        print(f"Session {session_id} database connection established successfully")
        return True
    except Exception as e:
        session_connections[session_id] = {
            "db_client": None,
            "log_repo": None,
            "metrics_repo": None,
            "query_repo": None,
            "connection_status": {
                "connected": False,
                "error": str(e),
                "dsn_masked": None
            }
        }
        print(f"Failed to connect session {session_id} to database: {e}")
        return False

def get_repositories():
    """Get repositories based on session or global configuration"""
    session_id = get_session_id()
    
    # Check if session has its own connection
    if session_id in session_connections:
        conn = session_connections[session_id]
        status = conn["connection_status"].copy()
        status["connection_type"] = "session"
        return conn["log_repo"], conn["metrics_repo"], conn["query_repo"], status
    
    # Fall back to global connection
    status = global_connection_status.copy()
    status["connection_type"] = "global"
    return global_log_repo, global_metrics_repo, global_query_repo, status

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/connection/status', methods=['GET'])
def get_connection_status():
    _, _, _, connection_status = get_repositories()
    return jsonify(connection_status)

@app.route('/api/connection/configure', methods=['POST'])
def configure_connection():
    data = request.get_json()
    dsn = data.get('dsn')
    is_global = data.get('global', False)
    session_id = get_session_id()
    
    if not dsn:
        return jsonify({'success': False, 'error': 'DSN is required'}), 400
    
    if is_global:
        # Configure global connection
        success = initialize_global_database(dsn)
        if success:
            save_dsn_config(dsn)  # Save to file for persistence
        _, _, _, connection_status = get_repositories()
    else:
        # Configure session-specific connection
        success = initialize_session_database(session_id, dsn)
        _, _, _, connection_status = get_repositories()
    
    return jsonify({
        'success': success,
        'status': connection_status
    })

@app.route('/api/logs', methods=['POST'])
def get_logs():
    log_repo, _, _, _ = get_repositories()
    filters = request.get_json() or {}
    result = log_repo.get_logs(filters)
    return jsonify(result)

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    _, metrics_repo, _, _ = get_repositories()
    metrics = metrics_repo.get_metrics()
    return jsonify(metrics)

@app.route('/api/queries', methods=['POST'])
def get_queries():
    _, _, query_repo, _ = get_repositories()
    filters = request.json or {}
    queries_data = query_repo.get_queries(filters)
    return jsonify(queries_data)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Databend Log Observer')
    parser.add_argument('--port', type=int, default=5002, help='Port to run the server on')
    parser.add_argument('--dsn', help='Databend DSN connection string (optional, can be configured via web interface)')
    
    args = parser.parse_args()
    
    # Load global DSN configuration from file on startup
    global_dsn = load_dsn_config()
    if global_dsn:
        initialize_global_database(global_dsn)
    
    print(f"🚀 Starting Databend Log Observer on port {args.port}")
    if not args.dsn and not global_dsn:
        print("💡 No DSN provided. Please configure database connection via web interface.")
    
    app.run(host='0.0.0.0', port=args.port, debug=True)
