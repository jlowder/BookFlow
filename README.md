# BookFlow

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Actions](https://github.com/jlowder/BookFlow/actions/workflows/publish.yml/badge.svg)](https://github.com/jlowder/BookFlow/actions/workflows/publish.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Testing-Playwright-blue.svg)](https://playwright.dev/)

BookFlow is a modern web-based reading journal that helps you track what you read, uncover patterns in your habits, and keep a complete history of your literary journey. With a clean, intuitive interface, it's easy to organize your library, monitor progress, and stay motivated along the way.

![BookFlow Interface](screenshot.png)

## Simple Installation (docker)

First, initialize a docker named volume to store the journal:

```sh
docker volume create bookflow_data
```

### Web App Version
To run as a web application accessible via browser:

```sh
docker run -d --restart always -p 3000:3000 -v bookflow_data:/app/data ghcr.io/jlowder/bookflow/bookflow:latest
```

Then, browse to `localhost:3000`.

### Desktop (Electron) Version
To run as a desktop application inside a container (requires an X server on the host):

1. Allow the container to connect to your X server:
   ```sh
   xhost +local:docker
   ```
2. Run the application using docker-compose:
   ```sh
   docker compose up --build
   ```

This will launch the BookFlow desktop window directly on your screen while running the backend and frontend inside the container.

**Note:** If the window does not appear, check the logs: `docker compose logs -f`. Common issues include missing X11 permissions or an incorrect `DISPLAY` environment variable.

## Manual Installation

1. Clone the repo:
   ```sh
   git clone https://github.com/jlowder/BookFlow.git
   ```
2. Build the project directory:
   ```sh
   cd BookFlow
   npm install
   docker compose build
   ```
4. Deploy
   ```sh
   docker compose up -d
   ```

## Usage

**Add your current reads to get started.** Search for a title or author and select your book to create a card. Click any card to add personal notes or customize the color used in your timeline view.

**Each day that you read something, click the "Read Today" button.** That's pretty much it! You can mark a book complete by clicking the "Complete" checkmark in the
card (the rightmost button). Over time it will be able to report statistics about your reading habits, such as the number of pages you read each day even though you
never record the number of pages read per day. It will eventually be able to infer this rate based on how frequently you complete books and how many pages they each have.

**If you need to edit the timeline:** switch to the grid (All Time) view and click the Edit icon (center button in the card). Then,
click any day in the grid to toggle the reading state for that day. Click the Edit icon again when you are done making edits.

**Note:** Only the 30-day view is supported on small screens. That means you won't be able to use your phone for timeline edits since that requires the grid view.
Use your phone for quick updates like marking books read, but switch to a desktop or tablet for full timeline edits.

## License

MIT

## Contact

Project Link: [https://github.com/jlowder/BookFlow](https://github.com/jlowder/BookFlow)
