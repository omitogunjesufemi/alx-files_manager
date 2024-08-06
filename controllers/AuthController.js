import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const authToken = request.get('Authorization').split('Basic')[1].trim();
    const userDetails = Buffer.from(authToken, 'base64').toString('utf-8').split(':');

    const userCollections = dbClient.db.collection('users');
    const user = await userCollections.findOne({ email: userDetails[0] });

    if (user == null) {
      response.status(401).json({ error: 'Unauthorized' });
    } else {
      const uuidToken = uuidv4();
      const authKey = `auth_${uuidToken}`;
      await redisClient.set(authKey, user._id, 86400);

      response.status(200).json({ token: uuidToken });
    }
  }

  static async getDisconnect(request, response) {
    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      response.status(401).json({ error: 'Unauthorized' });
    } else {
      await redisClient.del(`auth_${xToken}`);
      response.status(201).send();
    }
  }
}

export default AuthController;
