# BookFlow

BookFlow is a modern, web-based reading journal designed to help you track your reading habits, discover insights, and maintain a complete history of your literary journey. With an intuitive interface and powerful features, BookFlow makes it easy to manage your library, monitor your progress, and stay motivated.

## Features

- **Dashboard**: Get a quick overview of your reading activity, including your current reading streak, the number of books you're currently reading, and your total completed books.
- **Reading Timeline**: Visualize your reading history on an interactive timeline, allowing you to see your reading patterns over various time ranges. 
- **Book Management**: Add new books to your journal, edit their details, and mark them as complete.
- **Data Management**:
  - **Export**: Back up your entire reading history to a CSV file, ensuring your data is always safe.
  - **Import**: Restore your reading journal from a CSV backup, making it easy to migrate your data.
- **Dockerized Deployment**: Easy deployment using docker

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
