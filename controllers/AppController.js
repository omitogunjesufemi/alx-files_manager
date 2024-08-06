import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(request, response) {
    const dbAlive = dbClient.isAlive();
    const redisAlive = redisClient.isAlive();

    response.status(200).json({
      redis: redisAlive,
      db: dbAlive,
    });
  }

  static getStats(request, response) {
    const usersCount = dbClient.nbUsers();
    const filesCount = dbClient.nbUsers();

    response.status(200).json({
      users: usersCount,
      files: filesCount,
    });
  }
}

export default AppController;
