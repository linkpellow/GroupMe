#!/bin/bash

# Create destination directory if it doesn't exist
mkdir -p dialer-app/client/public/images/groups

# Find the image files - search in common locations
echo "Looking for GroupMe image files..."

# If files are in the current directory
for img in IMG_8016.JPG IMG_8191.JPG IMG_8192.JPG IMG_8193.JPG IMG_8194.JPG IMG_8195.PNG IMG_8196.JPG; do
  if [ -f "$img" ]; then
    echo "Found $img in current directory"
    cp "$img" dialer-app/client/public/images/groups/
    echo "Copied $img to dialer-app/client/public/images/groups/"
  fi
done

# If files are in Downloads folder
for img in IMG_8016.JPG IMG_8191.JPG IMG_8192.JPG IMG_8193.JPG IMG_8194.JPG IMG_8195.PNG IMG_8196.JPG; do
  if [ -f "$HOME/Downloads/$img" ]; then
    echo "Found $img in Downloads folder"
    cp "$HOME/Downloads/$img" dialer-app/client/public/images/groups/
    echo "Copied $img to dialer-app/client/public/images/groups/"
  fi
done

# Check if any files were copied
file_count=$(ls -1 dialer-app/client/public/images/groups/ | wc -l)
if [ $file_count -gt 0 ]; then
  echo "Success! $file_count image files are now in the correct location."
  echo "GroupMe chat should now display the proper group images."
else
  echo "No image files were found. Please move the following files to dialer-app/client/public/images/groups/ manually:"
  echo "IMG_8016.JPG (HOT SHOTS)"
  echo "IMG_8191.JPG (CLOSERS REGION)"
  echo "IMG_8192.JPG (The Money Team)" 
  echo "IMG_8193.JPG (Cant Stop. Won't Stop.)"
  echo "IMG_8194.JPG (MAXED OUT)"
  echo "IMG_8195.PNG (Squadzilla)"
  echo "IMG_8196.JPG (Elevate Your Faith)"
fi 