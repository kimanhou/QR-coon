#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username user --dbname mydb <<-EOSQL
    DROP TABLE IF EXISTS events;
    CREATE TABLE events (
        id SERIAL PRIMARY KEY,
        location VARCHAR(100),
        sprint VARCHAR(100),
        date TIMESTAMP WITH TIME ZONE,
        session VARCHAR(100)
    );

    INSERT INTO events (id, location, sprint, date, session)
    SELECT * FROM json_populate_recordset(NULL::events, pg_read_file('/docker-entrypoint-initdb.d/data-events.json')::json);
EOSQL

psql -v ON_ERROR_STOP=1 --username user --dbname mydb <<-EOSQL
    DROP TABLE IF EXISTS people;
    CREATE TABLE people (
        id UUID PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        direct_manager VARCHAR(255)
    );

    INSERT INTO people (id, first_name, last_name, email, direct_manager)
    SELECT * FROM json_populate_recordset(NULL::people, pg_read_file('/docker-entrypoint-initdb.d/data-people.json')::json);
EOSQL

psql -v ON_ERROR_STOP=1 --username user --dbname mydb <<-EOSQL
    DROP TABLE IF EXISTS event_attendees;
    CREATE TABLE event_attendees (
        id SERIAL PRIMARY KEY,
        event_id INT REFERENCES events(id) ON DELETE CASCADE,
        person_id UUID REFERENCES people(id) ON DELETE CASCADE
    );

    INSERT INTO event_attendees (id, event_id, person_id)
    SELECT * FROM json_populate_recordset(NULL::event_attendees, pg_read_file('/docker-entrypoint-initdb.d/data-event_attendees.json')::json);
EOSQL

psql -v ON_ERROR_STOP=1 --username user --dbname mydb <<-EOSQL
    DROP TABLE IF EXISTS scans;
    CREATE TABLE scans (
        id UUID PRIMARY KEY,
        event_id INT REFERENCES events(id),
        person_id UUID REFERENCES people(id),
        timestamp BIGINT,
        method VARCHAR(50),
        server_received_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 1. Parse JSON into a temporary structure where types match the JSON source
    INSERT INTO scans (id, event_id, person_id, timestamp, method, server_received_at)
    SELECT
        (val->>'id')::UUID,
        (val->>'event_id')::INT,
        (val->>'person_id')::UUID,
        (val->>'timestamp')::BIGINT,
        (val->>'method')::VARCHAR,
        -- 2. Explicitly convert the numeric epoch to TIMESTAMPTZ
        to_timestamp((val->>'server_received_at')::BIGINT)
    FROM (
        SELECT json_array_elements(pg_read_file('/docker-entrypoint-initdb.d/data-scans.json')::json) AS val
    ) AS seed_data;
EOSQL
