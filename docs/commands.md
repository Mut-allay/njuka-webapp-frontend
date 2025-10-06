=========================== GIT SHORTCUTS & COMMANDS
⚙️ INITIAL SETUP
git init # Initialize a new Git repository
git clone <repo-url> # Clone a remote repo to your local machine
git remote add origin <url> # Add remote repository
git remote -v # View configured remotes
git remote set-url origin <url> # Change the remote URL

🌿 BRANCHING
git branch # List all local branches
git branch <branch-name> # Create a new branch
git checkout <branch-name> # Switch to another branch
git checkout -b <branch-name> # Create AND switch to a new branch
git fetch origin # Download latest branches from remote
git pull origin <branch> # Pull latest changes from remote branch
git push -u origin <branch> # Push branch to remote and set upstream
git push -u origin <branch> --force # Force push to remote (overwrite)

🔄 MERGING & INTEGRATING BRANCHES
This workflow is for merging changes from one branch (e.g., dev) into your current feature branch (e.g., Backend/Direct-Messaging).

Bash

# Step 1: Prepare your local branch

git checkout Backend/Direct-Messaging
git fetch origin # Update your local repo with the latest from the remote
git pull origin Backend/Direct-Messaging # Ensure your branch is up-to-date

# Step 2: Merge the target branch into yours

# This command merges the remote 'dev' branch into your current branch

git merge origin/dev

# Step 3: Handle Merge Conflicts (if they occur)

# If the merge is not clean, Git will tell you which files have conflicts.

# Open the conflicted files in your editor (like VS Code) and resolve the differences.

# Your editor will show markers like <<<<<<< HEAD, =======, and >>>>>>> dev.

# Choose the code you want to keep and remove these markers.

# After resolving conflicts in a file, stage it

git add <conflicted-file-name>

# Once all conflicted files are staged, commit the merge

git commit -m "Merge dev branch into Backend/Direct-Messaging"

# Step 4: Push the merged branch to the remote

git push origin Backend/Direct-Messaging

# Step 5: Deploy your updated functions

📦 STAGING & COMMITTING
git status # Show file changes
git add . # Stage all changes
git add <filename> # Stage specific file
git commit -m "message" # Commit staged changes
git log # View commit history

🚀 PUSHING & PULLING
git push # Push committed changes
git pull # Pull latest changes
git push origin <branch> # Push to specific branch
git push --set-upstream origin <branch> # Set the upstream branch
git push --force # Force push to overwrite remote

🗑️ DELETING FILES & FOLDERS
git rm -r <folder-name> # Remove folder from Git tracking
git commit -m "Remove folder" # Commit the deletion
git push # Push the updated repo to GitHub

🔐 AUTHENTICATION
gh auth login # Login to GitHub using GitHub CLI
git config --global user.name "Your Name" # Set your Git username
git config --global user.email "you@example.com" # Set your Git email

🔍 CHECKING REPO INFO
git config --get remote.origin.url # See the remote URL
git branch -a # Show all local and remote branches
git rev-parse --abbrev-ref HEAD # Show current branch name

🔥 FIREBASE
npm install -g firebase-tools
firebase login
firebase logout
firebase init
firebase init functions # In your project directory
firebase emulators:start --only functions
taskkill /F /IM java.exe #to kill the emulators
netstat -aon | findstr "8080" #To Listen to Which Ports Are in Use
firebase use project_id
firebase projects:list

☁️ GOOGLE CLOUD
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

💻 DEVELOPMENT
General
pnpm run build
pnpm exec firebase deploy --only hosting
pnpm run build:staging
pnpm run server
npm run dev:emulator
firebase deploy --only functions

Blog Functions
Bash

cd functions
npm run build
npm run serve
npm test
npm run type-check
