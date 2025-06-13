-- Comprehensive log observation query that joins all three system tables
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
WHERE 
    -- These filters will be replaced by parameters in the application
    l.timestamp BETWEEN :start_time AND :end_time
    AND (:log_level IS NULL OR l.log_level = :log_level)
    AND (:target IS NULL OR l.target LIKE CONCAT('%', :target, '%'))
    AND (:query_id IS NULL OR l.query_id = :query_id)
    AND (:message_search IS NULL OR l.message LIKE CONCAT('%', :message_search, '%'))
ORDER BY l.timestamp DESC
LIMIT :limit_rows;
