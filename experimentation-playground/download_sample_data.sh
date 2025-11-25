#!/bin/bash

# Google Drive folder link
DRIVE_URL="https://drive.google.com/drive/folders/1Ya783Uy0Tpn1Ysez14yPOY3Nk4H8pugw?usp=sharing"

# Extract folder ID from the URL
FOLDER_ID="1Ya783Uy0Tpn1Ysez14yPOY3Nk4H8pugw"

# Create data directory if it doesn't exist
mkdir -p data

# Change to data directory
cd data

echo "Downloading files from Google Drive folder..."
echo "Folder ID: $FOLDER_ID"

# Install gdown if not already installed
if ! command -v gdown &> /dev/null; then
    echo "gdown not found. Installing with uv..."
    uv pip install gdown
fi

# Download the entire folder using uv run to ensure it's in the right environment
uv run gdown --folder "$FOLDER_ID" --remaining-ok

echo "Download complete! Files saved to data/ directory"
