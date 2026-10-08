# Getting set up

Do these steps first. By the end, you'll have everything installed, the project running on your computer, and access to everything you need. If you get stuck anywhere, message me.

## What you'll be using

- **VS Code** is the code editor. It's where you'll open the project, read and change files, talk to Claude Code, and type commands.
- **The terminal** is a window where you type commands instead of clicking buttons. VS Code has one built in, and it always opens in your project folder.
- **Git** keeps track of every change to the code, so nothing is ever lost, and lets you work on your own branch.
- **GitHub** is the website where the shared copy of the code lives. Pull requests and my reviews happen there.
- **Node.js** runs JavaScript outside the browser. We use it to run the tests. It comes with **npm**, which runs the project's commands, like `npm test`.
- **Claude Code** is the AI coding assistant. It reads the project and writes code when you ask it to.
- **Supabase** is the database. You'll use its website to look at the data your code saves.
- **Vercel** puts the app on the internet, and makes a preview link for every pull request.

## 1. Make your accounts

1. Make a GitHub account at github.com, and send me your username.
2. I'll send you invites to the GitHub repo and the Supabase project. Accept each one from its email. For Supabase, signing in with your GitHub account is easiest.
3. Sign up for Claude at claude.ai. Claude Code is a paid service.

## 2. Install VS Code

Download it from code.visualstudio.com, open the downloaded file, and drag Visual Studio Code into your Applications folder.

To open VS Code's terminal, go to the Terminal menu and choose New Terminal.

## 3. Install Git

Open the Terminal app (search for "Terminal" in Spotlight), type `git --version` and press Enter. If Git isn't installed yet, your Mac will offer to install it. Click Install.

Then tell Git your name and email, so your commits are labelled as yours. In a terminal, run these two commands with your own details:

```
git config --global user.name "Your Name"
git config --global user.email "the email you used for GitHub"
```

You only need to do this once.

## 4. Install Node.js

Download the version marked LTS from nodejs.org, and run the installer. npm comes with it.

To check it worked, open a new terminal and run `node --version`. You should see a version number.

## 5. Install Claude Code

1. In VS Code, open the Extensions panel. It's the icon made of four squares on the left, or press Cmd+Shift+X.
2. Search for "Claude Code", and install the one made by Anthropic.
3. Open Claude Code from the icon it adds to VS Code, and sign in when it asks. This opens your browser so you can log in.

## 6. Clone the repo

Cloning means downloading your own copy of the project from GitHub onto your computer. Git remembers where the copy came from. Later, that lets you pull down other people's changes and push your own back up.

1. Open VS Code. On the Welcome page, click "Clone Git Repository". If you don't see it, press Cmd+Shift+P, type "Git: Clone", and press Enter.
2. Paste this link, and press Enter: https://github.com/RichardLun/connection-app
3. Pick a folder to save the project in. Documents is fine. Sign in to GitHub if VS Code asks you to.
4. When VS Code asks whether to open the cloned repository, click Open.

The project's files now show on the left side of VS Code.

## 7. Run the project

Open a terminal in VS Code (Terminal menu, then New Terminal), and run these two commands:

```
npm install
npm test
```

- `npm install` downloads the tools the project uses. You only need it after cloning, or when I tell you the tools have changed.
- `npm test` runs the automated tests. There aren't any yet, so near the end it should say `pass 0` and `fail 0`.

Then run:

```
npm run dev
```

1. It prints a link, like `http://localhost:3000`. Open it in your browser.
2. You should see the starter page. After a second, it should say "Connected to the database". That means the app on your computer is talking to Supabase.
3. If it says "Couldn't reach the database" instead, send me a screenshot.
4. When you're done, go back to the terminal and press Control+C (not Cmd+C) to stop the app.

## 8. Check that you can see everything

- **GitHub:** open https://github.com/RichardLun/connection-app. You should see the project's files.
- **Supabase:** go to supabase.com and open the connection-app project. Click Table Editor in the left sidebar. You should see six tables: groups, people, sessions, attendance, answers and ticks. They're empty for now.
- **Vercel:** open the live site at https://connection-app-alpha.vercel.app. It should show the same starter page you saw on your computer, also saying "Connected to the database".
- **Claude Code:** with the project open in VS Code, open Claude Code and ask "What is this project, and what's in it so far?" It should read the files and describe them.

## Done

Once everything above works, let me know. Then I'll send you the project outline to read.
