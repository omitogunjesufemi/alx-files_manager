import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const authHeader = request.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const authToken = authHeader.split('Basic')[1].trim();
    const userDetails = Buffer.from(authToken, 'base64').toString('utf-8').split(':');

    const userCollections = dbClient.db.collection('users');
    const user = await userCollections.findOne({ email: userDetails[0] });

    const hash = crypto.createHash('sha1').update(userDetails[1], 'utf-8');
    const hashPwd = hash.digest('hex');

    if (user == null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    if (hashPwd !== user.password) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const uuidToken = uuidv4();
    const authKey = `auth_${uuidToken}`;
    await redisClient.set(authKey, user._id, 86400);

    return response.status(200).json({ token: uuidToken });
  }

  static async getDisconnect(request, response) {
    const xToken = request.get('X-Token');
    if (!xToken) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(`auth_${xToken}`);
    return response.status(201).send();
  }
}

export default AuthController;
