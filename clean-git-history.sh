#!/bin/bash

# This script will clean sensitive information from your Git history
# WARNING: This will rewrite your Git history. Make sure you understand the implications.
# If you've already pushed this repository, you'll need to force push after running this.

echo "Cleaning sensitive information from Git history..."

# Use git filter-branch to remove sensitive information
git filter-branch --force --index-filter \
  "git ls-files -z | xargs -0 sed -i '' -e 's/8045305778:AAFa9AwdMLt8aeMqiYtqNEwykl4DhwAtlr4/your-bot-token-here/g' -e 's/-1002403494821/your-chat-id-here/g' -e 's/\"11\"/\"your-topic-id-here\"/g'" \
  --prune-empty --tag-name-filter cat -- --all

# Force garbage collection to remove the old commits
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "Git history cleaned. You may need to force push with: git push --force"
echo "IMPORTANT: Revoke your old Telegram bot token and create a new one!"
