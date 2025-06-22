// Database table field definitions for intelligent filtering
// This file contains field definitions for log_history and query_history tables

const TABLE_FIELDS = {
    logs: {
        tableName: 'log_history',
        fields: [
            { name: 'timestamp', type: 'TIMESTAMP', description: 'The timestamp when the log entry was recorded' },
            { name: 'path', type: 'VARCHAR', description: 'Source file path and line number of the log' },
            { name: 'target', type: 'VARCHAR', description: 'Target module or component of the log' },
            { name: 'log_level', type: 'VARCHAR', description: 'Log level (e.g., INFO, ERROR, WARN, DEBUG)' },
            { name: 'cluster_id', type: 'VARCHAR', description: 'Identifier of the cluster' },
            { name: 'node_id', type: 'VARCHAR', description: 'Identifier of the node' },
            { name: 'warehouse_id', type: 'VARCHAR', description: 'Identifier of the warehouse' },
            { name: 'query_id', type: 'VARCHAR', description: 'Query ID associated with the log' },
            { name: 'message', type: 'VARCHAR', description: 'Log message content' },
            { name: 'fields', type: 'VARIANT', description: 'Additional fields (as a JSON object)' },
            { name: 'batch_number', type: 'BIGINT', description: 'Internal use, no special meaning' }
        ]
    },
    queries: {
        tableName: 'query_history',
        fields: [
            { name: 'log_type', type: 'TINYINT', description: 'The query status' },
            { name: 'log_type_name', type: 'VARCHAR', description: 'The name of query status' },
            { name: 'handler_type', type: 'VARCHAR', description: 'The protocol or handler used for the query (e.g., HTTPQuery, MySQL)' },
            { name: 'tenant_id', type: 'VARCHAR', description: 'The tenant identifier' },
            { name: 'cluster_id', type: 'VARCHAR', description: 'The cluster identifier' },
            { name: 'node_id', type: 'VARCHAR', description: 'The node identifier' },
            { name: 'sql_user', type: 'VARCHAR', description: 'The user who executed the query' },
            { name: 'sql_user_quota', type: 'VARCHAR', description: 'The quota information of the user' },
            { name: 'sql_user_privileges', type: 'VARCHAR', description: 'The privileges of the user' },
            { name: 'query_id', type: 'VARCHAR', description: 'The unique identifier for the query' },
            { name: 'query_kind', type: 'VARCHAR', description: 'The kind of query (e.g., Query, Insert, CopyIntoTable, etc.)' },
            { name: 'query_text', type: 'VARCHAR', description: 'The SQL text of the query' },
            { name: 'query_hash', type: 'VARCHAR', description: 'The hash value of the query text' },
            { name: 'query_parameterized_hash', type: 'VARCHAR', description: 'The hash value of the query regardless of the specific values' },
            { name: 'event_date', type: 'DATE', description: 'The date when the event occurred' },
            { name: 'event_time', type: 'TIMESTAMP', description: 'The timestamp when the event occurred' },
            { name: 'query_start_time', type: 'TIMESTAMP', description: 'The timestamp when the query started' },
            { name: 'query_duration_ms', type: 'BIGINT', description: 'The duration of the query in milliseconds' },
            { name: 'query_queued_duration_ms', type: 'BIGINT', description: 'The time the query spent in the queue in milliseconds' },
            { name: 'current_database', type: 'VARCHAR', description: 'The database in use when the query was executed' },
            { name: 'written_rows', type: 'BIGINT UNSIGNED', description: 'The number of rows written by the query' },
            { name: 'written_bytes', type: 'BIGINT UNSIGNED', description: 'The number of bytes written by the query' },
            { name: 'join_spilled_rows', type: 'BIGINT UNSIGNED', description: 'The number of rows spilled during join operations' },
            { name: 'join_spilled_bytes', type: 'BIGINT UNSIGNED', description: 'The number of bytes spilled during join operations' },
            { name: 'agg_spilled_rows', type: 'BIGINT UNSIGNED', description: 'The number of rows spilled during aggregation operations' },
            { name: 'agg_spilled_bytes', type: 'BIGINT UNSIGNED', description: 'The number of bytes spilled during aggregation operations' },
            { name: 'group_by_spilled_rows', type: 'BIGINT UNSIGNED', description: 'The number of rows spilled during group by operations' },
            { name: 'group_by_spilled_bytes', type: 'BIGINT UNSIGNED', description: 'The number of bytes spilled during group by operations' },
            { name: 'written_io_bytes', type: 'BIGINT UNSIGNED', description: 'The number of bytes written to IO' },
            { name: 'written_io_bytes_cost_ms', type: 'BIGINT UNSIGNED', description: 'The IO cost in milliseconds for writing' },
            { name: 'scan_rows', type: 'BIGINT UNSIGNED', description: 'The number of rows scanned by the query' },
            { name: 'scan_bytes', type: 'BIGINT UNSIGNED', description: 'The number of bytes scanned by the query' },
            { name: 'scan_io_bytes', type: 'BIGINT UNSIGNED', description: 'The number of IO bytes read during scanning' },
            { name: 'scan_io_bytes_cost_ms', type: 'BIGINT UNSIGNED', description: 'The IO cost in milliseconds for scanning' },
            { name: 'scan_partitions', type: 'BIGINT UNSIGNED', description: 'The number of partitions scanned' },
            { name: 'total_partitions', type: 'BIGINT UNSIGNED', description: 'The total number of partitions involved' },
            { name: 'result_rows', type: 'BIGINT UNSIGNED', description: 'The number of rows in the query result' },
            { name: 'result_bytes', type: 'BIGINT UNSIGNED', description: 'The number of bytes in the query result' },
            { name: 'bytes_from_remote_disk', type: 'BIGINT UNSIGNED', description: 'The number of bytes read from remote disk' },
            { name: 'bytes_from_local_disk', type: 'BIGINT UNSIGNED', description: 'The number of bytes read from local disk' },
            { name: 'bytes_from_memory', type: 'BIGINT UNSIGNED', description: 'The number of bytes read from memory' },
            { name: 'client_address', type: 'VARCHAR', description: 'The address of the client that issued the query' },
            { name: 'user_agent', type: 'VARCHAR', description: 'The user agent string of the client' },
            { name: 'exception_code', type: 'INT', description: 'The exception code if the query failed' },
            { name: 'exception_text', type: 'VARCHAR', description: 'The exception message if the query failed' },
            { name: 'server_version', type: 'VARCHAR', description: 'The version of the server that processed the query' },
            { name: 'query_tag', type: 'VARCHAR', description: 'The tag associated with the query' },
            { name: 'has_profile', type: 'BOOLEAN', description: 'Whether the query has an associated execution profile' },
            { name: 'peek_memory_usage', type: 'VARIANT', description: 'The peak memory usage during query execution (as a JSON object)' },
            { name: 'session_id', type: 'VARCHAR', description: 'The session identifier associated with the query' }
        ]
    }
};

// Common SQL operators for intelligent suggestions
const SQL_OPERATORS = [
    { op: '=', description: 'Equal to', example: "sql_user = 'admin'" },
    { op: '!=', description: 'Not equal to', example: "log_level != 'INFO'" },
    { op: '<>', description: 'Not equal to (alternative)', example: "exception_code <> 0" },
    { op: '>', description: 'Greater than', example: "query_duration_ms > 1000" },
    { op: '>=', description: 'Greater than or equal', example: "result_rows >= 100" },
    { op: '<', description: 'Less than', example: "scan_bytes < 1000000" },
    { op: '<=', description: 'Less than or equal', example: "written_rows <= 50" },
    { op: 'LIKE', description: 'Pattern matching', example: "message LIKE '%error%'" },
    { op: 'NOT LIKE', description: 'Pattern not matching', example: "query_text NOT LIKE '%DROP%'" },
    { op: 'IN', description: 'In list of values', example: "log_level IN ('ERROR', 'WARN')" },
    { op: 'NOT IN', description: 'Not in list of values', example: "handler_type NOT IN ('MySQL')" },
    { op: 'IS NULL', description: 'Is null', example: "exception_text IS NULL" },
    { op: 'IS NOT NULL', description: 'Is not null', example: "query_tag IS NOT NULL" },
    { op: 'BETWEEN', description: 'Between two values', example: "query_duration_ms BETWEEN 100 AND 5000" }
];

// Common value suggestions for specific fields
const FIELD_VALUE_SUGGESTIONS = {
    log_level: ['INFO', 'ERROR', 'WARN', 'DEBUG', 'TRACE'],
    handler_type: ['HTTPQuery', 'MySQL', 'FlightSQL', 'ClickHouse'],
    query_kind: ['Query', 'Insert', 'CopyIntoTable', 'Update', 'Delete', 'CreateTable', 'DropTable'],
    log_type_name: ['Start', 'Finish', 'Error', 'Aborted'],
    has_profile: ['true', 'false']
};

// Helper functions for intelligent filtering
class FilterHelper {
    // Get field suggestions based on table type
    static getFieldSuggestions(tableType) {
        return TABLE_FIELDS[tableType]?.fields || [];
    }
    
    // Get operator suggestions
    static getOperatorSuggestions() {
        return SQL_OPERATORS;
    }
    
    // Get value suggestions for a specific field
    static getValueSuggestions(fieldName) {
        return FIELD_VALUE_SUGGESTIONS[fieldName] || [];
    }
    
    // Parse WHERE condition and extract components
    static parseWhereCondition(condition) {
        const trimmed = condition.trim();
        
        // Try to match different patterns
        const patterns = [
            // field = 'value' or field = value
            /^(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)$/i,
            // field LIKE 'pattern'
            /^(\w+)\s+(LIKE|NOT\s+LIKE)\s+(.+)$/i,
            // field IN (values)
            /^(\w+)\s+(IN|NOT\s+IN)\s*\((.+)\)$/i,
            // field IS NULL / IS NOT NULL
            /^(\w+)\s+(IS\s+NULL|IS\s+NOT\s+NULL)$/i,
            // field BETWEEN value1 AND value2
            /^(\w+)\s+BETWEEN\s+(.+)\s+AND\s+(.+)$/i
        ];
        
        for (const pattern of patterns) {
            const match = trimmed.match(pattern);
            if (match) {
                return {
                    field: match[1],
                    operator: match[2],
                    value: match[3] || '',
                    isValid: true
                };
            }
        }
        
        return {
            field: '',
            operator: '',
            value: '',
            isValid: false
        };
    }
    
    // Validate WHERE condition
    static validateWhereCondition(condition, tableType) {
        const parsed = this.parseWhereCondition(condition);
        if (!parsed.isValid) {
            return { valid: false, error: 'Invalid WHERE condition syntax' };
        }
        
        const fields = this.getFieldSuggestions(tableType);
        const fieldExists = fields.some(f => f.name.toLowerCase() === parsed.field.toLowerCase());
        
        if (!fieldExists) {
            return { valid: false, error: `Field '${parsed.field}' does not exist in ${tableType} table` };
        }
        
        return { valid: true, parsed };
    }
    
    // Generate suggestions based on current input
    static generateSuggestions(input, tableType) {
        const suggestions = [];
        const inputLower = input.toLowerCase();
        
        if (!input.trim()) {
            // Show field suggestions when input is empty
            const fields = this.getFieldSuggestions(tableType);
            return fields.slice(0, 10).map(field => ({
                type: 'field',
                text: field.name,
                description: field.description,
                example: `${field.name} = 'value'`
            }));
        }
        
        // Try to parse current input
        const parsed = this.parseWhereCondition(input);
        
        if (parsed.isValid) {
            // Input is a valid condition, suggest similar patterns
            const valueSuggestions = this.getValueSuggestions(parsed.field);
            return valueSuggestions.map(value => ({
                type: 'value',
                text: `${parsed.field} ${parsed.operator} '${value}'`,
                description: `${parsed.field} equals ${value}`,
                example: `${parsed.field} ${parsed.operator} '${value}'`
            }));
        } else {
            // Input is incomplete, suggest fields and operators
            const fields = this.getFieldSuggestions(tableType);
            const matchingFields = fields.filter(field => 
                field.name.toLowerCase().includes(inputLower) ||
                field.description.toLowerCase().includes(inputLower)
            );
            
            return matchingFields.slice(0, 8).map(field => ({
                type: 'field',
                text: field.name,
                description: field.description,
                example: `${field.name} = 'value'`
            }));
        }
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TABLE_FIELDS, SQL_OPERATORS, FIELD_VALUE_SUGGESTIONS, FilterHelper };
}
