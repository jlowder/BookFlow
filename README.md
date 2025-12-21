# BookFlow

BookFlow is a modern web-based reading journal that helps you track what you read, uncover patterns in your habits, and keep a complete history of your literary journey. With a clean, intuitive interface, it’s easy to organize your library, monitor progress, and stay motivated along the way.


## Features

- **Dashboard**: Get a quick overview of your reading activity: visual timeline, current reading streak, and book counts.
- **Reading Timeline**: Visualize your reading history on an interactive timeline, reminiscent of a github contribution graph.
- **Book Management**: Add new books, track your reading progress, and mark them complete.
- **Data Management**:
  - **Export**: Back up your entire reading history to a CSV file, ensuring your data is always safe.
  - **Import**: Restore your reading journal from a CSV backup, making it easy to migrate your data.
- **Dockerized Deployment**: Easy deployment using docker-compose.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Installation

1. Clone the repo:
   ```sh
   git clone https://github.com/jlowder/BookFlow.git
   ```
2. Navigate to the project directory:
   ```sh
   cd BookFlow
   ```
3. Build
   ```sh
   docker-compose build
   ```
4. Deploy
   ```sh
   docker-compose up -d
   ```
5. Browse to `http://localhost:5000`.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/jlowder/BookFlow](https://github.com/jlowder/BookFlow)
