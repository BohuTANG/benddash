from databend_driver import BlockingDatabendClient
import os
from typing import Dict, List, Tuple, Optional, Any
import datetime
from urllib.parse import urlparse

# Shared constants
TIME_RANGES = {
    '1m': 'NOW() - INTERVAL 1 MINUTE',
    '5m': 'NOW() - INTERVAL 5 MINUTE', 
    '15m': 'NOW() - INTERVAL 15 MINUTE',
    '30m': 'NOW() - INTERVAL 30 MINUTE',
    '1h': 'NOW() - INTERVAL 1 HOUR',
    '3h': 'NOW() - INTERVAL 3 HOUR',
    '6h': 'NOW() - INTERVAL 6 HOUR',
    '12h': 'NOW() - INTERVAL 12 HOUR',
    '24h': 'NOW() - INTERVAL 24 HOUR',
    '2d': 'NOW() - INTERVAL 2 DAY'
}

LEVEL_MAP = {'warning': 'WARN', 'error': 'ERROR', 'info': 'INFO', 'debug': 'DEBUG'}

BUCKET_PRECISION = {
    '1m': 'SECOND', '5m': 'MINUTE', '15m': 'MINUTE', '30m': 'MINUTE',
    '1h': 'MINUTE', '3h': 'HOUR', '6h': 'HOUR', '12h': 'HOUR',
    '24h': 'HOUR', '2d': 'HOUR'
}

class DatabendClient:
    def __init__(self, dsn=None):
        self.client = None
        self.database = None
        if dsn:
            self._connect_with_dsn(dsn)
        else:
            self._connect()
    
    def _connect(self):
        dsn = os.getenv('DATABEND_DSN')
        if not dsn:
            raise ValueError("DATABEND_DSN environment variable not set")
        self._connect_with_dsn(dsn)
    
    def _connect_with_dsn(self, dsn):
        self.client = BlockingDatabendClient(dsn)
        parsed_dsn = urlparse(dsn)
        if parsed_dsn.path and parsed_dsn.path.strip('/'):
            self.database = parsed_dsn.path.strip('/')
        else:
            self.database = 'system_history'
            print("⚠️ Warning: No database specified in DSN, defaulting to 'system_history'.")
    
    def execute_query(self, query: str, params: List = None) -> Tuple[List, List, Optional[str]]:
        import time
        start_time = time.time()
        
        try:
            cursor = self.client.cursor()
            
            # Log the SQL query and parameters
            if params:
                print(f"🔍 Executing SQL: {query}")
                print(f"📋 Parameters: {params}")
                cursor.execute(query, params)
            else:
                print(f"🔍 Executing SQL: {query}")
                cursor.execute(query)
            
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            
            # Calculate and log execution time
            execution_time = time.time() - start_time
            row_count = len(rows) if rows else 0
            print(f"⏱️  Query executed in {execution_time:.3f}s, returned {row_count} rows")
            
            return rows, columns, None
        except Exception as e:
            execution_time = time.time() - start_time
            print(f"❌ Query failed after {execution_time:.3f}s: {str(e)}")
            return [], [], str(e)

class BaseRepository:
    """Base repository class with shared functionality"""
    def __init__(self, db_client: DatabendClient):
        self.db = db_client
    
    def _add_time_filter(self, conditions: List[str], filters: Dict, time_field: str = 'timestamp'):
        """Add time range filter to conditions"""
        if filters.get('timeRange') in TIME_RANGES:
            conditions.append(f"{time_field} >= {TIME_RANGES[filters['timeRange']]}")
    
    def _add_search_filter(self, conditions: List[str], params: List, filters: Dict, search_field: str = 'message'):
        """Add search filter to conditions"""
        if filters.get('search'):
            conditions.append(f"{search_field} LIKE ?")
            params.append(f"%{filters['search']}%")

class LogRepository(BaseRepository):
    def __init__(self, db_client: DatabendClient):
        super().__init__(db_client)
    
    def get_logs(self, filters: Dict) -> Dict[str, Any]:
        page = filters.get('page', 1)
        page_size = min(filters.get('pageSize', 200), 200)
        offset = (page - 1) * page_size
        
        where_conditions, params = self._build_where_clause(filters)
        where_clause = f"WHERE {where_conditions}" if where_conditions else ""
        
        # Get global stats (without level filter) for the same time range and search
        stats_filters = {k: v for k, v in filters.items() if k != 'level'}
        stats_where_conditions, stats_params = self._build_where_clause(stats_filters)
        stats_where_clause = f"WHERE {stats_where_conditions}" if stats_where_conditions else ""
        
        # Execute all queries in parallel using a single CTE query to reduce database requests
        return self._get_logs_combined(where_clause, params, stats_where_clause, stats_params, page_size, offset, filters.get('timeRange', '5m'), page)
    
    def _build_where_clause(self, filters: Dict) -> Tuple[str, List]:
        conditions = []
        params = []
        
        if filters.get('queryId'):
            conditions.append("query_id = ?")
            params.append(filters['queryId'])
            # Level filter still applies for query ID search
            if filters.get('level') and filters['level'] in LEVEL_MAP:
                conditions.append(f"log_level = '{LEVEL_MAP[filters['level']]}'")
        else:
            self._add_time_filter(conditions, filters)
            
            # Level mapping
            if filters.get('level') and filters['level'] in LEVEL_MAP:
                conditions.append(f"log_level = '{LEVEL_MAP[filters['level']]}'")
            
            self._add_search_filter(conditions, params, filters)
        
        return " AND ".join(conditions), params
    
    def _get_logs_combined(self, where_clause: str, params: List, stats_where_clause: str, stats_params: List, page_size: int, offset: int, time_range: str, page: int) -> Dict[str, Any]:
        """Combined query to get logs, stats, count and time distribution in one request"""
        is_query_id_search = any('query_id = ?' in where_clause for _ in [where_clause])
        
        if is_query_id_search:
            precision = 'HOUR'
        else:
            precision = BUCKET_PRECISION.get(time_range, 'MINUTE')
        
        # Create parameter list combining both where clauses
        all_params = params + stats_params + params + stats_params
        
        combined_query = f"""
        WITH 
        -- Count filtered results
        count_data AS (
            SELECT COUNT(*) as total_count
            FROM {self.db.database}.log_history
            {where_clause}
        ),
        -- Get stats for same time range (without level filter)
        stats_data AS (
            SELECT 
                log_level,
                COUNT(*) as count
            FROM {self.db.database}.log_history
            {stats_where_clause}
            GROUP BY log_level
        ),
        -- Get paginated logs
        logs_data AS (
            SELECT 
                timestamp, query_id, log_level, target, message, path,
                cluster_id, node_id, warehouse_id, fields,
                ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
            FROM {self.db.database}.log_history
            {where_clause}
        ),
        -- Get time distribution
        time_dist_data AS (
            SELECT
                TRUNC(timestamp, '{precision}') as time_bucket,
                log_level,
                COUNT(*) as count
            FROM {self.db.database}.log_history
            {stats_where_clause}
            GROUP BY time_bucket, log_level
        )
        SELECT 
            'count' as data_type, total_count::VARCHAR as value1, NULL as value2, NULL as value3, NULL as value4, NULL as value5, NULL as value6, NULL as value7, NULL as value8, NULL as value9, NULL as value10
        FROM count_data
        UNION ALL
        SELECT 
            'stats' as data_type, log_level as value1, count::VARCHAR as value2, NULL as value3, NULL as value4, NULL as value5, NULL as value6, NULL as value7, NULL as value8, NULL as value9, NULL as value10
        FROM stats_data
        UNION ALL
        SELECT 
            'logs' as data_type, 
            timestamp::VARCHAR as value1, query_id as value2, log_level as value3, target as value4, 
            message as value5, path as value6, cluster_id as value7, node_id as value8, warehouse_id as value9, fields as value10
        FROM logs_data
        WHERE rn > {offset} AND rn <= {offset + page_size}
        UNION ALL
        SELECT 
            'time_dist' as data_type, time_bucket::VARCHAR as value1, log_level as value2, count::VARCHAR as value3,
            NULL as value4, NULL as value5, NULL as value6, NULL as value7, NULL as value8, NULL as value9, NULL as value10
        FROM time_dist_data
        ORDER BY data_type, value1
        """
        
        results, _, error = self.db.execute_query(combined_query, all_params)
        if error or not results:
            return {'logs': [], 'total': 0, 'page': page, 'pageSize': page_size, 'totalPages': 0, 'stats': {'total': 0, 'error': 0, 'warning': 0, 'info': 0, 'debug': 0}, 'timeDistribution': []}
        
        # Parse results
        total_count = 0
        stats = {'total': 0, 'error': 0, 'warning': 0, 'info': 0, 'debug': 0}
        logs = []
        time_buckets = {}
        
        level_map = {'ERROR': 'error', 'WARN': 'warning', 'INFO': 'info', 'DEBUG': 'debug'}
        
        for row in results:
            data_type = row[0]
            if data_type == 'count':
                total_count = int(row[1]) if row[1] else 0
            elif data_type == 'stats':
                level = row[1]
                count = int(row[2]) if row[2] else 0
                if level in level_map:
                    stats[level_map[level]] = count
            elif data_type == 'logs':
                log_dict = {
                    'timestamp': row[1],
                    'query_id': row[2],
                    'log_level': row[3],
                    'target': row[4],
                    'message': row[5],
                    'path': row[6],
                    'cluster_id': row[7],
                    'node_id': row[8],
                    'warehouse_id': row[9],
                    'fields': row[10]
                }
                logs.append(log_dict)
            elif data_type == 'time_dist':
                time_bucket = row[1]
                log_level = row[2]
                count = int(row[3]) if row[3] else 0
                if time_bucket not in time_buckets:
                    time_buckets[time_bucket] = {'time_bucket': time_bucket, 'total': 0, 'error': 0, 'warning': 0, 'info': 0, 'debug': 0}
                frontend_level = level_map.get(log_level, 'info')
                time_buckets[time_bucket][frontend_level] += count
                time_buckets[time_bucket]['total'] += count
        
        stats['total'] = sum(stats[key] for key in ['error', 'warning', 'info', 'debug'])
        time_distribution = sorted(time_buckets.values(), key=lambda x: x['time_bucket'] or '')
        
        return {
            'logs': logs,
            'total': total_count,
            'page': page,
            'pageSize': page_size,
            'totalPages': (total_count + page_size - 1) // page_size,
            'stats': stats,
            'timeDistribution': time_distribution
        }
    
    def _get_total_count(self, where_clause: str, params: List) -> int:
        query = f"SELECT COUNT(*) FROM {self.db.database}.log_history {where_clause}"
        results, _, error = self.db.execute_query(query, params)
        return results[0][0] if results and not error else 0
    
    def _get_stats(self, where_clause: str, params: List) -> Dict[str, int]:
        query = f"""
        SELECT 
            log_level,
            COUNT(*) as count
        FROM {self.db.database}.log_history
        {where_clause}
        GROUP BY log_level
        """
        
        results, _, error = self.db.execute_query(query, params)
        stats = {'total': 0, 'error': 0, 'warning': 0, 'info': 0, 'debug': 0}
        
        if not error and results:
            # Map database levels to frontend levels
            level_map = {'ERROR': 'error', 'WARN': 'warning', 'INFO': 'info', 'DEBUG': 'debug'}
            for level, count in results:
                if level in level_map:
                    stats[level_map[level]] = count
            # Calculate total from individual counts
            stats['total'] = sum(stats[key] for key in ['error', 'warning', 'info', 'debug'])
        
        return stats
    
    def _get_paginated_logs(self, where_clause: str, params: List, page_size: int, offset: int) -> List[Dict]:
        query = f"""
        SELECT 
            timestamp,
            query_id,
            log_level,
            target,
            message,
            path,
            cluster_id,
            node_id,
            warehouse_id,
            fields
        FROM {self.db.database}.log_history
        {where_clause}
        ORDER BY timestamp DESC
        LIMIT {page_size} OFFSET {offset}
        """
        
        results, columns, error = self.db.execute_query(query, params)
        if error or not results:
            return []
        
        logs = []
        for row in results:
            log_dict = dict(zip(columns, row))
            if log_dict.get('timestamp'):
                log_dict['timestamp'] = log_dict['timestamp'].isoformat()
            logs.append(log_dict)
        
        return logs
    
    def _get_time_distribution(self, where_clause: str, params: List, time_range: str) -> List[Dict]:
        """Generate time distribution data for charts"""
        # Check if this is a query ID search (no time range needed)
        is_query_id_search = any('query_id = ?' in where_clause for _ in [where_clause])
        
        if is_query_id_search:
            # For query ID search, use HOUR precision and no time range
            precision = 'HOUR'
        else:
            # Determine bucket precision based on time range
            precision = BUCKET_PRECISION.get(time_range, 'MINUTE')
        
        query = f"""
        SELECT
            TRUNC(timestamp, '{precision}') as time_bucket,
            log_level,
            COUNT(*) as count
        FROM {self.db.database}.log_history
        {where_clause}
        GROUP BY time_bucket, log_level
        ORDER BY time_bucket, log_level
        """
        
        results, _, error = self.db.execute_query(query, params)
        
        # Debug logging
        print(f"Time distribution query: {query}")
        print(f"Query params: {params}")
        print(f"Query error: {error}")
        print(f"Query results: {results}")
        
        if error or not results:
            print(f"No time distribution data: error={error}, results={results}")
            return []
        
        # Group results by time bucket and aggregate by log level
        time_buckets = {}
        for time_bucket, log_level, count in results:
            bucket_key = time_bucket.isoformat() if time_bucket else None
            if bucket_key not in time_buckets:
                time_buckets[bucket_key] = {
                    'time_bucket': bucket_key,
                    'total': 0,
                    'error': 0,
                    'warning': 0,
                    'info': 0,
                    'debug': 0
                }
            
            # Map database log levels to frontend levels
            level_map = {'ERROR': 'error', 'WARN': 'warning', 'INFO': 'info', 'DEBUG': 'debug'}
            frontend_level = level_map.get(log_level, 'info')
            
            time_buckets[bucket_key][frontend_level] += count
            time_buckets[bucket_key]['total'] += count
        
        # Convert to list and sort by time
        time_distribution = list(time_buckets.values())
        time_distribution.sort(key=lambda x: x['time_bucket'] or '')
        
        print(f"Final time distribution: {time_distribution}")
        return time_distribution

class QueryRepository(BaseRepository):
    def __init__(self, db_client: DatabendClient):
        super().__init__(db_client)
    
    def get_queries(self, filters: Dict) -> Dict[str, Any]:
        page = filters.get('page', 1)
        page_size = min(filters.get('pageSize', 200), 200)
        offset = (page - 1) * page_size
        
        where_conditions, params = self._build_where_clause(filters)
        where_clause = f"WHERE {where_conditions}" if where_conditions else ""
        
        # Execute all queries in a single combined query to reduce database requests
        return self._get_queries_combined(where_clause, params, page_size, offset, filters.get('timeRange', '5m'), page)
    
    def _build_where_clause(self, filters: Dict) -> Tuple[str, List]:
        conditions = []
        params = []
        
        self._add_time_filter(conditions, filters, time_field='query_start_time')
        
        # Query status filter
        if filters.get('status'):
            if filters['status'] == 'error':
                conditions.append("exception_code != 0")
            elif filters['status'] == 'success':
                conditions.append("exception_code = 0")
        
        # Query ID search
        if filters.get('queryId'):
            conditions.append("query_id = ?")
            params.append(filters['queryId'])
        
        # Text search in query_text
        self._add_search_filter(conditions, params, filters, search_field='query_text')
        
        # Database filter
        if filters.get('database'):
            conditions.append("current_database = ?")
            params.append(filters['database'])
        
        # User filter
        if filters.get('user'):
            conditions.append("sql_user = ?")
            params.append(filters['user'])
        
        # Default condition if none specified
        if not conditions:
            conditions.append("1=1")
        
        return " AND ".join(conditions), params
    
    def _get_queries_combined(self, where_clause: str, params: List, page_size: int, offset: int, time_range: str, page: int) -> Dict[str, Any]:
        """Combined query to get queries, stats, count and time distribution in one request"""
        precision = BUCKET_PRECISION.get(time_range, 'MINUTE')
        
        # Use params for all CTE queries
        all_params = params + params + params + params
        
        combined_query = f"""
        WITH 
        -- Count distinct queries
        count_data AS (
            SELECT COUNT(DISTINCT query_id) as total_count
            FROM {self.db.database}.query_history
            {where_clause}
        ),
        -- Get query statistics
        stats_data AS (
            SELECT
                COUNT(DISTINCT query_id) as total_queries,
                SUM(CASE WHEN exception_code = 0 THEN 1 ELSE 0 END) as success_queries,
                SUM(CASE WHEN exception_code != 0 THEN 1 ELSE 0 END) as error_queries,
                AVG(query_duration_ms) as avg_duration_ms
            FROM {self.db.database}.query_history
            {where_clause}
        ),
        -- Get paginated queries with row numbers
        queries_data AS (
            SELECT
                query_id, log_type_name, query_text, event_time, query_start_time,
                query_duration_ms, exception_code, exception_text, sql_user, current_database,
                query_kind, result_rows, result_bytes, scan_rows, scan_bytes, client_address,
                ROW_NUMBER() OVER (ORDER BY query_start_time DESC) as rn
            FROM {self.db.database}.query_history
            {where_clause}
        ),
        -- Get time distribution
        time_dist_data AS (
            SELECT
                TRUNC(query_start_time, '{precision}') as time_bucket,
                CASE WHEN exception_code IS NOT NULL AND exception_code != 0 THEN 'error' ELSE 'success' END as status,
                COUNT(*) as count
            FROM {self.db.database}.query_history
            {where_clause}
            GROUP BY time_bucket, status
        )
        SELECT 
            'count' as data_type, total_count::VARCHAR as col1, NULL as col2, NULL as col3, NULL as col4, NULL as col5, 
            NULL as col6, NULL as col7, NULL as col8, NULL as col9, NULL as col10, NULL as col11, NULL as col12, NULL as col13, NULL as col14, NULL as col15, NULL as col16
        FROM count_data
        UNION ALL
        SELECT 
            'stats' as data_type, total_queries::VARCHAR, success_queries::VARCHAR, error_queries::VARCHAR, avg_duration_ms::VARCHAR,
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
        FROM stats_data
        UNION ALL
        SELECT 
            'queries' as data_type, query_id, log_type_name, query_text, event_time::VARCHAR, query_start_time::VARCHAR,
            query_duration_ms::VARCHAR, exception_code::VARCHAR, exception_text, sql_user, current_database,
            query_kind, result_rows::VARCHAR, result_bytes::VARCHAR, scan_rows::VARCHAR, scan_bytes::VARCHAR, client_address
        FROM queries_data
        WHERE rn > {offset} AND rn <= {offset + page_size}
        UNION ALL
        SELECT 
            'time_dist' as data_type, time_bucket::VARCHAR, status, count::VARCHAR,
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
        FROM time_dist_data
        ORDER BY data_type, col1
        """
        
        results, _, error = self.db.execute_query(combined_query, all_params)
        if error or not results:
            return {'queries': [], 'total': 0, 'page': page, 'pageSize': page_size, 'totalPages': 0, 'stats': {'total': 0, 'success': 0, 'error': 0, 'avg_duration_ms': 0}, 'timeDistribution': []}
        
        # Parse results
        total_count = 0
        stats = {'total': 0, 'success': 0, 'error': 0, 'avg_duration_ms': 0}
        queries_raw = []
        time_buckets = {}
        
        for row in results:
            data_type = row[0]
            if data_type == 'count':
                total_count = int(row[1]) if row[1] else 0
            elif data_type == 'stats':
                stats = {
                    'total': int(row[1]) if row[1] else 0,
                    'success': int(row[2]) if row[2] else 0,
                    'error': int(row[3]) if row[3] else 0,
                    'avg_duration_ms': round(float(row[4])) if row[4] else 0
                }
            elif data_type == 'queries':
                query_dict = {
                    'query_id': row[1], 'log_type_name': row[2], 'query_text': row[3], 'event_time': row[4],
                    'query_start_time': row[5], 'query_duration_ms': int(row[6]) if row[6] else 0,
                    'exception_code': int(row[7]) if row[7] else 0, 'exception_text': row[8],
                    'sql_user': row[9], 'current_database': row[10], 'query_kind': row[11],
                    'result_rows': int(row[12]) if row[12] else 0, 'result_bytes': int(row[13]) if row[13] else 0,
                    'scan_rows': int(row[14]) if row[14] else 0, 'scan_bytes': int(row[15]) if row[15] else 0,
                    'client_address': row[16]
                }
                queries_raw.append(query_dict)
            elif data_type == 'time_dist':
                time_bucket = row[1]
                status = row[2]
                count = int(row[3]) if row[3] else 0
                if time_bucket not in time_buckets:
                    time_buckets[time_bucket] = {'time_bucket': time_bucket, 'total': 0, 'success': 0, 'error': 0}
                time_buckets[time_bucket][status] += count
                time_buckets[time_bucket]['total'] += count
        
        # Process queries to calculate durations and deduplicate
        processed_queries = self._process_query_durations(queries_raw)
        time_distribution = sorted(time_buckets.values(), key=lambda x: x['time_bucket'] or '')
        
        return {
            'queries': processed_queries,
            'total': total_count,
            'page': page,
            'pageSize': page_size,
            'totalPages': (total_count + page_size - 1) // page_size,
            'stats': stats,
            'timeDistribution': time_distribution
        }
    
    def _get_total_count(self, where_clause: str, params: List) -> int:
        query = f"""
        SELECT COUNT(DISTINCT query_id) as total 
        FROM {self.db.database}.query_history
        {where_clause}
        """
        
        rows, _, error = self.db.execute_query(query, params)
        if error or not rows:
            return 0
        
        return rows[0][0] if rows[0][0] else 0
    
    def _get_stats(self, where_clause: str, params: List) -> Dict:
        # Get query statistics: total, success, error, avg duration
        query = f"""
        SELECT
            COUNT(DISTINCT query_id) as total_queries,
            SUM(CASE WHEN exception_code = 0 THEN 1 ELSE 0 END) as success_queries,
            SUM(CASE WHEN exception_code != 0 THEN 1 ELSE 0 END) as error_queries,
            AVG(query_duration_ms) as avg_duration_ms
        FROM {self.db.database}.query_history
        {where_clause}
        """
        
        rows, _, error = self.db.execute_query(query, params)
        if error or not rows:
            return {'total': 0, 'success': 0, 'error': 0, 'avg_duration_ms': 0}
        
        return {
            'total': rows[0][0] if rows[0][0] else 0,
            'success': rows[0][1] if rows[0][1] else 0,
            'error': rows[0][2] if rows[0][2] else 0,
            'avg_duration_ms': round(rows[0][3]) if rows[0][3] else 0
        }
    
    def _get_paginated_queries(self, where_clause: str, params: List, limit: int, offset: int) -> List[Dict]:
        # Get query history with start and end events
        query = f"""
        SELECT
            query_id,
            log_type_name,
            query_text,
            event_time,
            query_start_time,
            query_duration_ms,
            exception_code,
            exception_text,
            sql_user,
            current_database,
            query_kind,
            result_rows,
            result_bytes,
            scan_rows,
            scan_bytes,
            client_address
        FROM {self.db.database}.query_history
        {where_clause}
        ORDER BY query_start_time DESC
        LIMIT {limit} OFFSET {offset}
        """
        
        rows, columns, error = self.db.execute_query(query, params)
        if error or not rows:
            return []
        
        result = []
        for row in rows:
            query_data = {}
            for i, col in enumerate(columns):
                query_data[col] = row[i]
            result.append(query_data)
        
        return result
    
    def _process_query_durations(self, queries: List[Dict]) -> List[Dict]:
        # Group queries by query_id to calculate durations between start and end events
        query_map = {}
        processed_queries = []
        
        for query in queries:
            query_id = query['query_id']
            if query_id not in query_map:
                query_map[query_id] = {
                    'query_id': query_id,
                    'query_text': query['query_text'],
                    'sql_user': query['sql_user'],
                    'current_database': query['current_database'],
                    'query_kind': query['query_kind'],
                    'query_start_time': query['query_start_time'],
                    'event_time': query['event_time'],
                    'duration_ms': query['query_duration_ms'],
                    'status': 'error' if query['exception_code'] and query['exception_code'] != 0 else 'success',
                    'exception_code': query['exception_code'],
                    'exception_text': query['exception_text'],
                    'result_rows': query['result_rows'],
                    'result_bytes': query['result_bytes'],
                    'scan_rows': query['scan_rows'],
                    'scan_bytes': query['scan_bytes'],
                    'client_address': query['client_address']
                }
            
            # Update duration and status for QueryEnd events
            if query['log_type_name'] == 'QueryEnd':
                query_map[query_id]['duration_ms'] = query['query_duration_ms']
                query_map[query_id]['status'] = 'error' if query['exception_code'] and query['exception_code'] != 0 else 'success'
                query_map[query_id]['exception_code'] = query['exception_code']
                query_map[query_id]['exception_text'] = query['exception_text']
        
        # Convert to list and return unique query entries
        seen_query_ids = set()
        for query_id, data in query_map.items():
            if query_id not in seen_query_ids:
                processed_queries.append(data)
                seen_query_ids.add(query_id)
        
        return processed_queries
    
    def _get_time_distribution(self, where_clause: str, params: List, time_range: str) -> List[Dict]:
        """Generate time distribution data for charts"""
        # Determine bucket precision based on time range
        precision = BUCKET_PRECISION.get(time_range, 'MINUTE')
        
        query = f"""
        SELECT
            TRUNC(query_start_time, '{precision}') as time_bucket,
            CASE WHEN exception_code IS NOT NULL AND exception_code != 0 THEN 'error' ELSE 'success' END as status,
            COUNT(*) as count
        FROM {self.db.database}.query_history
        {where_clause}
        GROUP BY time_bucket, status
        ORDER BY time_bucket, status
        """
        
        results, _, error = self.db.execute_query(query, params)
        
        # Debug logging
        print(f"Query time distribution query: {query}")
        print(f"Query params: {params}")
        print(f"Query error: {error}")
        print(f"Query results: {results}")
        
        # Additional debug: check if there are any QueryEnd records at all
        debug_query = """
        SELECT COUNT(*) as total_queryend,
               MIN(query_start_time) as earliest_time,
               MAX(query_start_time) as latest_time
        FROM system_history.query_history
        WHERE log_type_name = 'QueryEnd'
        """
        debug_results, _, debug_error = self.db.execute_query(debug_query, [])
        print(f"Debug QueryEnd check: {debug_results}")
        
        if error or not results:
            print(f"No query time distribution data: error={error}, results={results}")
            return []
        
        # Group results by time bucket and aggregate by status
        time_buckets = {}
        for time_bucket, status, count in results:
            bucket_key = time_bucket.isoformat() if time_bucket else None
            if bucket_key not in time_buckets:
                time_buckets[bucket_key] = {
                    'time_bucket': bucket_key,
                    'total': 0,
                    'success': 0,
                    'error': 0
                }
            
            time_buckets[bucket_key][status] += count
            time_buckets[bucket_key]['total'] += count
        
        # Convert to list and sort by time
        time_distribution = list(time_buckets.values())
        time_distribution.sort(key=lambda x: x['time_bucket'] or '')
        
        print(f"Final query time distribution: {time_distribution}")
        return time_distribution


class MetricsRepository:
    def __init__(self, db_client: DatabendClient):
        self.db = db_client
    
    def get_metrics(self) -> Dict[str, Any]:
        # Combine all metrics queries into a single request
        combined_query = """
        WITH 
        total_logs AS (
            SELECT COUNT(*) as count 
            FROM system_history.log_history 
            WHERE timestamp >= NOW() - INTERVAL 24 HOUR
        ),
        error_rate AS (
            SELECT (COUNT(CASE WHEN log_level = 'ERROR' THEN 1 END) * 100.0 / COUNT(*)) as rate
            FROM system_history.log_history 
            WHERE timestamp >= NOW() - INTERVAL 24 HOUR
        ),
        active_queries AS (
            SELECT COUNT(DISTINCT query_id) as count
            FROM system_history.log_history 
            WHERE timestamp >= NOW() - INTERVAL 5 MINUTE AND query_id IS NOT NULL
        )
        SELECT 
            'total_logs' as metric_type, count::VARCHAR as value
        FROM total_logs
        UNION ALL
        SELECT 
            'error_rate' as metric_type, rate::VARCHAR as value
        FROM error_rate
        UNION ALL
        SELECT 
            'active_queries' as metric_type, count::VARCHAR as value
        FROM active_queries
        UNION ALL
        SELECT 
            'avg_query_time' as metric_type, '0.0' as value
        """
        
        results, _, error = self.db.execute_query(combined_query)
        metrics = {'totalLogs': 0, 'errorRate': 0.0, 'avgQueryTime': 0.0, 'activeQueries': 0}
        
        if not error and results:
            for metric_type, value in results:
                if metric_type == 'total_logs':
                    metrics['totalLogs'] = int(value) if value else 0
                elif metric_type == 'error_rate':
                    metrics['errorRate'] = round(float(value), 2) if value else 0.0
                elif metric_type == 'active_queries':
                    metrics['activeQueries'] = int(value) if value else 0
                elif metric_type == 'avg_query_time':
                    metrics['avgQueryTime'] = float(value) if value else 0.0
        
        return metrics
    
    def _get_total_logs(self) -> int:
        query = "SELECT COUNT(*) FROM system_history.log_history WHERE timestamp >= NOW() - INTERVAL 24 HOUR"
        results, _, error = self.db.execute_query(query)
        return results[0][0] if results and not error else 0
    
    def _get_error_rate(self) -> float:
        query = """
        SELECT (COUNT(CASE WHEN log_level = 'ERROR' THEN 1 END) * 100.0 / COUNT(*)) as error_rate
        FROM system_history.log_history 
        WHERE timestamp >= NOW() - INTERVAL 24 HOUR
        """
        results, _, error = self.db.execute_query(query)
        return round(results[0][0], 2) if results and not error else 0.0
    
    def _get_avg_query_time(self) -> float:
        # log_history doesn't have query duration, return 0
        return 0.0
    
    def _get_active_queries(self) -> int:
        query = """
        SELECT COUNT(DISTINCT query_id) 
        FROM system_history.log_history 
        WHERE timestamp >= NOW() - INTERVAL 5 MINUTE AND query_id IS NOT NULL
        """
        results, _, error = self.db.execute_query(query)
        return results[0][0] if results and not error else 0
