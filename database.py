from databend_driver import BlockingDatabendClient
import os
from typing import Dict, List, Tuple, Optional, Any
import datetime
from urllib.parse import urlparse

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
        try:
            cursor = self.client.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            
            return rows, columns, None
        except Exception as e:
            return [], [], str(e)

class LogRepository:
    def __init__(self, db_client: DatabendClient):
        self.db = db_client
    
    def get_logs(self, filters: Dict) -> Dict[str, Any]:
        page = filters.get('page', 1)
        page_size = min(filters.get('pageSize', 50), 200)
        offset = (page - 1) * page_size
        
        where_conditions, params = self._build_where_clause(filters)
        where_clause = f"WHERE {where_conditions}" if where_conditions else ""
        
        # Get total count for filtered results
        total_count = self._get_total_count(where_clause, params)
        
        # Get global stats (without level filter) for the same time range and search
        stats_filters = {k: v for k, v in filters.items() if k != 'level'}
        stats_where_conditions, stats_params = self._build_where_clause(stats_filters)
        stats_where_clause = f"WHERE {stats_where_conditions}" if stats_where_conditions else ""
        stats = self._get_stats(stats_where_clause, stats_params)
        
        # Get paginated logs
        logs = self._get_paginated_logs(where_clause, params, page_size, offset)
        
        # Get time distribution data
        time_distribution = self._get_time_distribution(stats_where_clause, stats_params, filters.get('timeRange', '5m'))
        
        return {
            'logs': logs,
            'total': total_count,
            'page': page,
            'pageSize': page_size,
            'totalPages': (total_count + page_size - 1) // page_size,
            'stats': stats,
            'timeDistribution': time_distribution
        }
    
    def _build_where_clause(self, filters: Dict) -> Tuple[str, List]:
        conditions = []
        params = []
        
        # Time range mapping
        time_ranges = {
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
        
        # 查询ID搜索 - 当搜索query ID时，不需要时间范围和其他过滤条件
        if filters.get('queryId'):
            conditions.append("query_id = ?")
            params.append(filters['queryId'])
            # Level filter still applies for query ID search
            level_map = {'warning': 'WARN', 'error': 'ERROR', 'info': 'INFO', 'debug': 'DEBUG'}
            if filters.get('level') and filters['level'] in level_map:
                conditions.append(f"log_level = '{level_map[filters['level']]}'")
        else:
            # 只有在没有查询ID时才应用时间范围和普通搜索
            if filters.get('timeRange') in time_ranges:
                conditions.append(f"timestamp >= {time_ranges[filters['timeRange']]}")
            
            # Level mapping
            level_map = {'warning': 'WARN', 'error': 'ERROR', 'info': 'INFO', 'debug': 'DEBUG'}
            if filters.get('level') and filters['level'] in level_map:
                conditions.append(f"log_level = '{level_map[filters['level']]}'")
            
            # 普通文本搜索
            if filters.get('search'):
                conditions.append("message LIKE ?")
                params.append(f"%{filters['search']}%")
        
        return " AND ".join(conditions), params
    
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
            bucket_precision = {
                '1m': 'SECOND',   # For 1 minute, group by second
                '5m': 'MINUTE',   # For 5 minutes, group by minute
                '15m': 'MINUTE',  # For 15 minutes, group by minute
                '30m': 'MINUTE',  # For 30 minutes, group by minute
                '1h': 'MINUTE',   # For 1 hour, group by minute
                '3h': 'HOUR',     # For 3 hours, group by hour
                '6h': 'HOUR',     # For 6 hours, group by hour
                '12h': 'HOUR',    # For 12 hours, group by hour
                '24h': 'HOUR',    # For 24 hours, group by hour
                '2d': 'HOUR'      # For 2 days, group by hour
            }
            precision = bucket_precision.get(time_range, 'MINUTE')
        
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

class QueryRepository:
    def __init__(self, db_client: DatabendClient):
        self.db = db_client
    
    def get_queries(self, filters: Dict) -> Dict[str, Any]:
        page = filters.get('page', 1)
        page_size = min(filters.get('pageSize', 50), 200)
        offset = (page - 1) * page_size
        
        where_conditions, params = self._build_where_clause(filters)
        where_clause = f"WHERE {where_conditions}" if where_conditions else ""
        
        # Get total count for filtered results
        total_count = self._get_total_count(where_clause, params)
        
        # Get statistics for the same time range and search
        stats = self._get_stats(where_clause, params)
        
        # Get paginated queries
        queries = self._get_paginated_queries(where_clause, params, page_size, offset)
        
        # Process queries to calculate durations
        processed_queries = self._process_query_durations(queries)
        
        # Get time distribution data
        time_distribution = self._get_time_distribution(where_clause, params, filters.get('timeRange', '5m'))
        
        return {
            'queries': processed_queries,
            'total': total_count,
            'page': page,
            'pageSize': page_size,
            'totalPages': (total_count + page_size - 1) // page_size,
            'stats': stats,
            'timeDistribution': time_distribution
        }
    
    def _build_where_clause(self, filters: Dict) -> Tuple[str, List]:
        conditions = []
        params = []
        
        # Time range mapping
        time_ranges = {
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
        
        if filters.get('timeRange') in time_ranges:
            conditions.append(f"query_start_time >= {time_ranges[filters['timeRange']]}")
        
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
        if filters.get('search'):
            conditions.append("query_text LIKE ?")
            params.append(f"%{filters['search']}%")
        
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
        bucket_precision = {
            '1m': 'SECOND',   # For 1 minute, group by second
            '5m': 'MINUTE',   # For 5 minutes, group by minute
            '15m': 'MINUTE',  # For 15 minutes, group by minute
            '30m': 'MINUTE',  # For 30 minutes, group by minute
            '1h': 'MINUTE',   # For 1 hour, group by minute
            '3h': 'HOUR',     # For 3 hours, group by hour
            '6h': 'HOUR',     # For 6 hours, group by hour
            '12h': 'HOUR',    # For 12 hours, group by hour
            '24h': 'HOUR',    # For 24 hours, group by hour
            '2d': 'HOUR'      # For 2 days, group by hour
        }
        
        precision = bucket_precision.get(time_range, 'MINUTE')
        
        # Temporarily remove log_type_name filter to debug
        # if where_clause:
        #     where_clause += " AND log_type_name = 'QueryEnd'"
        # else:
        #     where_clause = "WHERE log_type_name = 'QueryEnd'"
        
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
        metrics = {}
        
        metrics['totalLogs'] = self._get_total_logs()
        metrics['errorRate'] = self._get_error_rate()
        metrics['avgQueryTime'] = self._get_avg_query_time()
        metrics['activeQueries'] = self._get_active_queries()
        
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
