#!/usr/bin/env bash

# Script to initialize a new project from the Stenella template
# Usage: ./init_project.sh <new_project_name>

set -e

if [ -z "$1" ]; then
    echo "Usage: ./init_project.sh <new_project_name>"
    echo "Example: ./init_project.sh my-awesome-app"
    exit 1
fi

NEW_PROJECT_NAME="$1"

# Convert to title case for places where "Stenella" is used (e.g., Markdown headers)
# Assumes lowercase input, capitalizes the first letter of each word separated by hyphens or underscores
NEW_PROJECT_TITLE=$(echo "$NEW_PROJECT_NAME" | sed -E 's/(^|_|-)([a-z])/\1\U\2/g' | sed 's/[-_]/ /g')
NEW_PROJECT_TITLE_NOSPACES=$(echo "$NEW_PROJECT_TITLE" | sed 's/ //g')

echo "Initializing new project: $NEW_PROJECT_NAME"
echo "Title case replacing 'Stenella' with: $NEW_PROJECT_TITLE_NOSPACES"

# 1. Update file contents (ignore .git, dist, node_modules, venv, __pycache__)
echo "Replacing contents in files..."

# Find all files, excluding common binary/cache/vcs directories, and replace "stenella" and "Stenella"
find . -type f \
    -not -path '*/\.git/*' \
    -not -path '*/\.venv/*' \
    -not -path '*/venv/*' \
    -not -path '*/__pycache__/*' \
    -not -path '*/frontend/node_modules/*' \
    -not -path '*/frontend/dist/*' \
    -not -path '*/\.pytest_cache/*' \
    -not -path '*/\.idea/*' \
    -not -path '*/\.vscode/*' \
    -not -name 'init_project.sh' \
    -not -name 'uv.lock' \
    -not -name 'go.sum' \
    -not -name '*.jpg' -not -name '*.png' -not -name '*.gif' -not -name '*.ico' \
    -exec sed -i -e "s/stenella/$NEW_PROJECT_NAME/g" -e "s/Stenella/$NEW_PROJECT_TITLE_NOSPACES/g" {} +

echo "Content replacement complete."


# 2. Rename specific files/directories containing "stenella"
echo "Renaming specific files and directories..."

# Example: cmd/stenella-cli -> cmd/my-awesome-app-cli
if [ -d "cmd/stenella-cli" ]; then
    mv "cmd/stenella-cli" "cmd/${NEW_PROJECT_NAME}-cli"
    echo "Renamed cmd/stenella-cli to cmd/${NEW_PROJECT_NAME}-cli"
fi

if [ -f "stenella.openapi.json" ]; then
    mv "stenella.openapi.json" "${NEW_PROJECT_NAME}.openapi.json"
    echo "Renamed stenella.openapi.json to ${NEW_PROJECT_NAME}.openapi.json"
fi

echo ""
echo "=========================================================="
echo "Project initialization complete!"
echo "Next steps:"
echo "1. Review the changes (`git diff` or `git status`)."
echo "2. Update your Git remotes:"
echo "   git remote rename origin upstream"
echo "   git remote add origin <your-new-repo-url>"
echo "   git push -u origin main"
echo "3. Run 'docker compose ... up -d --build' to test."
echo "=========================================================="
