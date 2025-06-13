#!/usr/bin/env python3
"""
Test script for the Databend Log Observer SQL query
This script tests the log observation query against your Databend instance
"""

import sys
from databend_driver import BlockingDatabendClient

def test_log_query(dsn):
    """Test the log observation query"""
    
    # The main query that joins all three system tables
    query = """
    WITH log_data AS (
        SELECT 
            l.timestamp,
            l.path,
            l.target,
            l.log_level,
            l.cluster_id,
            l.node_id,
            l.warehouse_id,
            l.query_id,
            l.message,
            l.fields
        FROM system_history.log_history l
    ),
    query_data AS (
        SELECT 
            q.query_id,
            q.log_type_name,
            q.query_text,
            q.query_kind,
            q.query_start_time,
            q.query_duration_ms,
            q.sql_user,
            q.exception_code,
            q.exception_text,
            q.written_rows,
            q.written_bytes,
            q.scan_rows,
            q.scan_bytes,
            q.result_rows,
            q.result_bytes
        FROM system_history.query_history q
    ),
    profile_data AS (
        SELECT 
            p.query_id,
            p.profiles,
            p.statistics_desc
        FROM system_history.profile_history p
    )
    
    SELECT 
        l.timestamp,
        l.query_id,
        l.log_level,
        l.target,
        l.message,
        q.query_text,
        q.query_kind,
        q.query_start_time,
        q.query_duration_ms,
        q.sql_user,
        q.exception_code,
        q.exception_text,
        q.written_rows,
        q.scan_rows,
        q.result_rows,
        p.profiles
    FROM log_data l
    LEFT JOIN query_data q ON l.query_id = q.query_id
    LEFT JOIN profile_data p ON l.query_id = p.query_id
    WHERE l.timestamp >= NOW() - INTERVAL 1 HOUR
    ORDER BY l.timestamp DESC
    LIMIT 10
    """
    
    try:
        print("🔌 Connecting to Databend...")
        client = BlockingDatabendClient(dsn)
        cursor = client.cursor()
        
        print("✅ Connected successfully!")
        print("🔍 Testing log observation query...")
        
        cursor.execute(query)
        results = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        
        print(f"📊 Query executed successfully!")
        print(f"   Columns: {len(columns)}")
        print(f"   Rows returned: {len(results)}")
        
        if results:
            print("\n📋 Sample results:")
            print("-" * 80)
            
            # Print column headers
            print(" | ".join(f"{col[:12]:12}" for col in columns[:6]))
            print("-" * 80)
            
            # Print first few rows
            for i, row in enumerate(results[:3]):
                row_str = " | ".join(f"{str(val)[:12]:12}" for val in row[:6])
                print(row_str)
            
            if len(results) > 3:
                print(f"... and {len(results) - 3} more rows")
        else:
            print("ℹ️  No results found (this is normal if no recent activity)")
        
        print("\n🎉 Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python test_log_query.py <DSN>")
        print("Example: python test_log_query.py 'databend://user:pass@localhost:8000/default'")
        sys.exit(1)
    
    dsn = sys.argv[1]
    print("🧪 Databend Log Observer Query Test")
    print("=" * 50)
    
    success = test_log_query(dsn)
    
    if success:
        print("\n✅ All tests passed! Your Databend instance is ready for the Log Observer.")
        print("🚀 You can now run: python start_log_observer.py --dsn '" + dsn + "'")
    else:
        print("\n❌ Tests failed. Please check your Databend connection and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()
