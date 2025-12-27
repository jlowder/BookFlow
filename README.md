# BookFlow

BookFlow is a modern web-based reading journal that helps you track what you read, uncover patterns in your habits, and keep a complete history of your literary journey. With a clean, intuitive interface, it’s easy to organize your library, monitor progress, and stay motivated along the way.

![BookFlow Interface](screenshot.png)

## Features

- **Dashboard**: Get a quick overview of your reading activity: visual timeline, current reading streak, and book counts.
- **Reading Timeline**: Visualize your reading history on an interactive timeline, reminiscent of a github contribution graph.
- **Book Management**: Add new books, track your reading progress, and mark them complete.
- **Data Management**:
  - **Export**: Back up your entire reading history to a CSV file, ensuring your data is always safe.
  - **Import**: Restore your reading journal from a CSV backup, making it easy to migrate your data.
- **Dockerized Deployment**: Easy deployment through docker images.

## Getting Started

First, initialize a docker named volume to store the journal:

```sh
docker volume create bookflow_data
```

Then, download and run the docker image. If you want the app to be on a port other than 3000, change the first 3000 to
some other value.

```sh
docker run -d --restart always -d -p 3000:3000 -v bookflow_data:/app/data ghcr.io/jlowder/bookflow/bookflow:latest
```

Then, browse to localhost:3000, or whatever port you chose. The app will be installed permanently; that is, it will persist through reboots.
To uninstall it, you can just use `docker stop` and `docker rm` commands to stop the container and remove the cached bookflow image.

To check for new updates, you can run:

```sh
docker pull ghcr.io/jlowder/bookflow/bookflow:latest
```

If a new image downloaded, stop the current container (`docker stop <container-name>`), remove it (`docker rm <container-name>`), and run the new image (`docker run -d --restart always -d -p 3000:3000 -v bookflow_data:/app/data ghcr.io/jlowder/bookflow/bookflow:latest`).

## Manual Installation

1. Clone the repo:
   ```sh
   git clone https://github.com/jlowder/BookFlow.git
   ```
2. Navigate to the project directory:
   ```sh
   cd BookFlow
   npm install
   docker-compose build
   ```
4. Deploy
   ```sh
   docker-compose up -d
   ```

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/jlowder/BookFlow](https://github.com/jlowder/BookFlow)
