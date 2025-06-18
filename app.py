from flask import Flask, render_template, request, jsonify
from database import DatabendClient, LogRepository, MetricsRepository, QueryRepository
import os
import argparse
import json
from urllib.parse import urlparse

app = Flask(__name__)

# Global variables for database components
db_client = None
log_repo = None
metrics_repo = None
query_repo = None
connection_status = {"connected": False, "error": None, "dsn_masked": None}

# DSN configuration file path
DSN_CONFIG_FILE = os.path.join(os.path.dirname(__file__), '.dsn_config.json')

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
    """Save DSN configuration to file"""
    try:
        config = {'dsn': dsn}
        with open(DSN_CONFIG_FILE, 'w') as f:
            json.dump(config, f)
        return True
    except Exception as e:
        print(f"Failed to save DSN config: {e}")
        return False

def load_dsn_config():
    """Load DSN configuration from file"""
    try:
        if os.path.exists(DSN_CONFIG_FILE):
            with open(DSN_CONFIG_FILE, 'r') as f:
                config = json.load(f)
                return config.get('dsn')
    except Exception as e:
        print(f"Failed to load DSN config: {e}")
    return None

def initialize_database(dsn):
    """Initialize database connection and repositories."""
    import time
    start_time = time.time()
    
    global db_client, log_repo, metrics_repo, query_repo, connection_status
    
    try:
        print(f"🔗 Initializing database connection to: {mask_dsn(dsn)}")
        
        db_client = DatabendClient(dsn)
        
        # Test the connection with a simple query
        print("🧪 Testing database connection...")
        _, _, error = db_client.execute_query("SELECT 1")
        if error:
            raise Exception(f"Database connection test failed: {error}")
            
        print("📚 Initializing repositories...")
        log_repo = LogRepository(db_client)
        metrics_repo = MetricsRepository(db_client)
        query_repo = QueryRepository(db_client)
        
        connection_status = {
            "connected": True,
            "error": None,
            "dsn_masked": mask_dsn(dsn),
            "database": db_client.database,
            "message": "Successfully connected."
        }
        if not urlparse(dsn).path or not urlparse(dsn).path.strip('/'):
            connection_status['message'] = "Warning: No database specified in DSN, defaulting to 'system_history'."
        
        execution_time = time.time() - start_time
        print(f"✅ Database initialized successfully in {execution_time:.3f}s! Database: {db_client.database}")
        save_dsn_config(dsn)
        return True
    except Exception as e:
        execution_time = time.time() - start_time
        connection_status = {
            "connected": False,
            "error": str(e),
            "dsn_masked": mask_dsn(dsn) if dsn else None,
            "database": None
        }
        print(f"❌ Failed to initialize database after {execution_time:.3f}s: {e}")
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/connection/status', methods=['GET'])
def get_connection_status():
    return jsonify(connection_status)

@app.route('/api/connection/configure', methods=['POST'])
def configure_connection():
    import time
    start_time = time.time()
    
    try:
        data = request.get_json()
        dsn = data.get('dsn')
        print(f"📥 API /api/connection/configure called with DSN: {mask_dsn(dsn)}")
        
        if not dsn:
            return jsonify({'success': False, 'error': 'DSN is required'}), 400
        
        # Check if database is connected
        if not db_client or not connection_status["connected"]:
            return jsonify({
                'success': False,
                'message': 'Database not connected, please configure DSN first'
            }), 400
        
        success = initialize_database(dsn)
        
        execution_time = time.time() - start_time
        print(f"📤 API /api/connection/configure completed in {execution_time:.3f}s, success: {success}")
        
        return jsonify({
            'success': success,
            'status': connection_status
        })
    except Exception as e:
        execution_time = time.time() - start_time
        print(f"❌ API /api/connection/configure failed after {execution_time:.3f}s: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/logs', methods=['POST'])
def get_logs():
    import time
    start_time = time.time()
    
    if not connection_status["connected"]:
        return jsonify({
            'error': 'Database not connected. Please configure connection first.',
            'logs': [],
            'total': 0,
            'page': 1,
            'pageSize': 50,
            'totalPages': 0,
            'stats': {'total': 0, 'error': 0, 'warning': 0, 'info': 0, 'debug': 0}
        }), 503
    
    try:
        filters = request.get_json() or {}
        print(f"📥 API /api/logs called with filters: {filters}")
        
        result = log_repo.get_logs(filters)
        
        execution_time = time.time() - start_time
        print(f"📤 API /api/logs completed in {execution_time:.3f}s, returned {result.get('total', 0)} total logs")
        
        return jsonify(result)
    except Exception as e:
        execution_time = time.time() - start_time
        print(f"❌ API /api/logs failed after {execution_time:.3f}s: {str(e)}")
        return jsonify({
            'error': str(e),
            'logs': [],
            'total': 0,
            'page': 1,
            'pageSize': 50,
            'totalPages': 0,
            'stats': {'total': 0, 'error': 0, 'warning': 0, 'info': 0, 'debug': 0}
        }), 500

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    import time
    start_time = time.time()
    
    if not connection_status['connected']:
        return jsonify({'error': 'Database not connected'}), 400
    
    try:
        print(f"📥 API /api/metrics called")
        
        metrics = metrics_repo.get_metrics()
        
        execution_time = time.time() - start_time
        print(f"📤 API /api/metrics completed in {execution_time:.3f}s")
        
        return jsonify(metrics)
    except Exception as e:
        execution_time = time.time() - start_time
        print(f"❌ API /api/metrics failed after {execution_time:.3f}s: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/queries', methods=['POST'])
def get_queries():
    import time
    start_time = time.time()
    
    if not connection_status['connected']:
        return jsonify({'error': 'Database not connected'}), 400
    
    try:
        filters = request.json or {}
        print(f"📥 API /api/queries called with filters: {filters}")
        
        queries_data = query_repo.get_queries(filters)
        
        execution_time = time.time() - start_time
        print(f"📤 API /api/queries completed in {execution_time:.3f}s, returned {queries_data.get('total', 0)} total queries")
        
        return jsonify(queries_data)
    except Exception as e:
        execution_time = time.time() - start_time
        print(f"❌ API /api/queries failed after {execution_time:.3f}s: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Databend Log Observer')
    parser.add_argument('--port', type=int, default=5002, help='Port to run the server on')
    parser.add_argument('--dsn', help='Databend DSN connection string (optional, can be configured via web interface)')
    
    args = parser.parse_args()
    
    # Load DSN from config file if exists
    dsn = load_dsn_config()
    
    # Initialize database if DSN provided
    if args.dsn:
        initialize_database(args.dsn)
    elif dsn:
        initialize_database(dsn)
    
    print(f"🚀 Starting Databend Log Observer on port {args.port}")
    if not args.dsn and not dsn:
        print("💡 No DSN provided. Please configure database connection via web interface.")
    
    app.run(host='0.0.0.0', port=args.port, debug=True)
