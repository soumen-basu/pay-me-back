#!/usr/bin/env bash
set -e

echo "Starting up the Postgres database for testing (test.env)..."
# We only want to spin up the 'db' service, passing in test.env
# We use docker compose with a project name to isolate it from the main app
docker compose -p stenella_test --env-file env/test.env up -d db

echo "Waiting for the database to be ready..."
sleep 5

echo "Running pytest inside the test environment..."
# Export the flag so conftest.py knows to connect to Postgres
export USE_POSTGRES_FOR_TESTS=true

# Parse env file line by line to avoid spaces issues
while IFS= read -r line || [ -n "$line" ]; do
  if [[ -n "$line" && "$line" != \#* ]]; then
    # remove export if present
    line="${line#export }"
    # extract key and value
    key="${line%%=*}"
    val="${line#*=}"
    
    # Trim optional surrounding quotes
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"

    export "$key"="$val"
  fi
done < env/test.env

# Override DB_HOST because pytest runs on the host machine, not in the docker network
export DB_HOST=localhost

# Make sure PYTHONPATH is set
export PYTHONPATH=.

echo "Executing tests..."
uv run pytest tests/api/api_v1/test_flows.py -v

echo "Tests completed."
echo "Leaving the test database running for manual inspection as requested."
