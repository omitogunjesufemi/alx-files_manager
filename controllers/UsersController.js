import crypto from 'crypto';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;

    if (email == null || email === undefined) {
      response.status(400).json({
        error: 'Missing email',
      });
      return;
    }

    if (password == null || password === undefined) {
      response.status(400).json({
        error: 'Missing password',
      });
      return;
    }

    const userCollections = dbClient.db.collection('users');
    const existingUser = await userCollections.findOne({ email });

    if (existingUser) {
      response.status(400).json({
        error: 'Already exist',
      });
      return;
    }

    const hash = crypto.createHash('sha1').update(password, 'utf-8');
    const hashPwd = hash.digest('hex');

    const doc = {
      email,
      password: hashPwd,
    };

    const result = await userCollections.insertOne(doc);
    const newUser = result.ops[0];

    response.status(201).json({
      id: newUser._id,
      email: newUser.email,
    });
  }
}

export default UsersController;
