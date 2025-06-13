#!/usr/bin/env python3
"""
BendDash Demo Script
===================

This script demonstrates how to use the BendDash log observer platform.
It shows basic usage patterns and provides examples for common tasks.
"""

import time
import requests
import json
from databend_driver import BlockingDatabendClient

def demo_connection_test():
    """Demo: Test connection to Databend"""
    print("🔌 Demo: Testing Databend Connection")
    print("-" * 40)
    
    # Example DSN - replace with your actual connection string
    dsn = "databend://root@localhost:8000/default"
    
    try:
        client = BlockingDatabendClient(dsn)
        cursor = client.cursor()
        
        # Test basic connectivity
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        
        if result and result[0] == 1:
            print("✅ Connection successful!")
            return True
        else:
            print("❌ Connection test failed")
            return False
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def demo_system_tables():
    """Demo: Query system tables to show available data"""
    print("\n📊 Demo: System Tables Overview")
    print("-" * 40)
    
    dsn = "databend://root@localhost:8000/default"
    
    try:
        client = BlockingDatabendClient(dsn)
        cursor = client.cursor()
        
        # Check log_history table
        cursor.execute("SELECT COUNT(*) FROM system_history.log_history")
        log_count = cursor.fetchone()[0]
        print(f"📝 Log entries: {log_count:,}")
        
        # Check query_history table
        cursor.execute("SELECT COUNT(*) FROM system_history.query_history")
        query_count = cursor.fetchone()[0]
        print(f"🔍 Query entries: {query_count:,}")
        
        # Check profile_history table
        cursor.execute("SELECT COUNT(*) FROM system_history.profile_history")
        profile_count = cursor.fetchone()[0]
        print(f"📈 Profile entries: {profile_count:,}")
        
        # Show recent activity
        cursor.execute("""
            SELECT log_level, COUNT(*) as count
            FROM system_history.log_history 
            WHERE timestamp >= NOW() - INTERVAL 1 HOUR
            GROUP BY log_level
            ORDER BY count DESC
        """)
        
        print("\n📋 Recent activity (last hour):")
        for row in cursor.fetchall():
            level, count = row
            print(f"   {level}: {count} entries")
            
        return True
        
    except Exception as e:
        print(f"❌ Error querying system tables: {e}")
        return False

def demo_api_calls():
    """Demo: Make API calls to the BendDash server"""
    print("\n🌐 Demo: API Calls")
    print("-" * 40)
    
    base_url = "http://localhost:5000"
    
    try:
        # Test metrics endpoint
        response = requests.get(f"{base_url}/api/metrics")
        if response.status_code == 200:
            metrics = response.json()
            print("📊 Current metrics:")
            print(f"   Total logs: {metrics.get('totalLogs', 'N/A')}")
            print(f"   Error rate: {metrics.get('errorRate', 'N/A')}%")
            print(f"   Avg query time: {metrics.get('avgQueryTime', 'N/A')}ms")
            print(f"   Active queries: {metrics.get('activeQueries', 'N/A')}")
        else:
            print(f"❌ Metrics API error: {response.status_code}")
            
        # Test logs endpoint with filters
        filter_data = {
            "timeRange": "1h",
            "logLevel": "ERROR",
            "limit": 5
        }
        
        response = requests.post(f"{base_url}/api/logs", json=filter_data)
        if response.status_code == 200:
            logs = response.json()
            print(f"\n📝 Recent ERROR logs ({len(logs)} entries):")
            for log in logs[:3]:  # Show first 3
                timestamp = log.get('timestamp', 'N/A')
                message = log.get('message', 'N/A')[:50] + "..."
                print(f"   {timestamp}: {message}")
        else:
            print(f"❌ Logs API error: {response.status_code}")
            
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to BendDash server. Make sure it's running on localhost:5000")
        return False
    except Exception as e:
        print(f"❌ API call error: {e}")
        return False

def demo_query_analysis():
    """Demo: Analyze query performance"""
    print("\n🔍 Demo: Query Performance Analysis")
    print("-" * 40)
    
    dsn = "databend://root@localhost:8000/default"
    
    try:
        client = BlockingDatabendClient(dsn)
        cursor = client.cursor()
        
        # Find slow queries
        cursor.execute("""
            SELECT 
                query_id,
                query_duration_ms,
                scan_rows,
                result_rows,
                LEFT(query_text, 50) as query_preview
            FROM system_history.query_history 
            WHERE query_duration_ms > 1000
            ORDER BY query_duration_ms DESC
            LIMIT 5
        """)
        
        print("🐌 Slowest queries (>1000ms):")
        for row in cursor.fetchall():
            query_id, duration, scan_rows, result_rows, preview = row
            print(f"   {query_id}: {duration}ms, scanned {scan_rows} rows")
            print(f"      Preview: {preview}...")
            
        # Find queries with high scan ratios
        cursor.execute("""
            SELECT 
                query_id,
                scan_rows,
                result_rows,
                CASE 
                    WHEN result_rows > 0 THEN scan_rows / result_rows 
                    ELSE scan_rows 
                END as scan_ratio
            FROM system_history.query_history 
            WHERE scan_rows > 1000 AND result_rows > 0
            ORDER BY scan_ratio DESC
            LIMIT 5
        """)
        
        print("\n📊 Queries with high scan ratios:")
        for row in cursor.fetchall():
            query_id, scan_rows, result_rows, ratio = row
            print(f"   {query_id}: {ratio:.1f}x ratio ({scan_rows} scanned, {result_rows} returned)")
            
        return True
        
    except Exception as e:
        print(f"❌ Error analyzing queries: {e}")
        return False

def main():
    """Run all demos"""
    print("🚀 BendDash Demo")
    print("=" * 50)
    print("This demo shows how to use the BendDash log observer platform.")
    print("Make sure Databend is running and BendDash server is started.\n")
    
    # Run demos
    demos = [
        demo_connection_test,
        demo_system_tables,
        demo_query_analysis,
        demo_api_calls
    ]
    
    results = []
    for demo in demos:
        try:
            result = demo()
            results.append(result)
            time.sleep(1)  # Brief pause between demos
        except KeyboardInterrupt:
            print("\n\n⏹️  Demo interrupted by user")
            break
        except Exception as e:
            print(f"\n❌ Demo error: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Demo Summary:")
    success_count = sum(1 for r in results if r)
    total_count = len(results)
    print(f"   Successful: {success_count}/{total_count}")
    
    if success_count == total_count:
        print("🎉 All demos completed successfully!")
        print("🌐 Access BendDash at: http://localhost:5000")
    else:
        print("⚠️  Some demos failed. Check your Databend connection and BendDash server.")

if __name__ == "__main__":
    main()
