#!/bin/bash

# Initialize the database
superset db upgrade

# Create default roles and permissions
superset init

# Create an admin user (only if it doesn't already exist)
superset fab create-admin \
    --username admin \
    --firstname Admin \
    --lastname Admin \
    --email admin@example.com \
    --password admin

# Start the Superset server
superset run -p 8088 -h 0.0.0.0
