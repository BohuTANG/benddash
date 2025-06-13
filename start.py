#!/usr/bin/env python3
"""
Databend Log Observer Startup Script
====================================

Simple wrapper to start the Databend Log Observer with command line arguments.

Usage:
    python start.py [--dsn DSN] [--port PORT]

Examples:
    python start.py --port 5002 --dsn "databend://user:pass@host"
"""

import sys
import subprocess

def main():
    # Simply pass all arguments to app.py
    args = ['python', 'app.py'] + sys.argv[1:]
    
    print("🚀 Starting Databend Log Observer...")
    print(f"   Command: {' '.join(args)}")
    print("=" * 50)
    
    try:
        subprocess.run(args, check=True)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down Databend Log Observer...")
        print("👋 Goodbye!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
