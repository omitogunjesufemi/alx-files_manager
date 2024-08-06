import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;

    if (email == null || email === undefined) {
      return response.status(400).json({
        error: 'Missing email',
      });
    }

    if (password == null || password === undefined) {
      return response.status(400).json({
        error: 'Missing password',
      });
    }

    const userCollections = dbClient.db.collection('users');
    const existingUser = await userCollections.findOne({ email });

    if (existingUser) {
      return response.status(400).json({
        error: 'Already exist',
      });
    }

    const hash = crypto.createHash('sha1').update(password, 'utf-8');
    const hashPwd = hash.digest('hex');

    const doc = {
      email,
      password: hashPwd,
    };

    const result = await userCollections.insertOne(doc);
    const newUser = result.ops[0];

    return response.status(201).json({
      id: newUser._id,
      email: newUser.email,
    });
  }

  static async getMe(request, response) {
    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    return response.json({
      id: user._id,
      email: user.email,
    });
  }
}

export default UsersController;
