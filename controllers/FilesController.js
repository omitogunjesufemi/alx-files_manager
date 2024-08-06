import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);

class FilesController {
  static async postUpload(request, response) {
    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      response.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = request.body;

    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }

    if (!type) {
      return response.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.getFileById(parentId);
      if (!parentFile) {
        return response.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile && parentFile.type === 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDoc = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: parentId || 0,
    };

    if (type === 'folder') {
      const resultFolder = await dbClient.createFile(fileDoc);
      return response.status(201).json(resultFolder.ops[0]);
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    await mkdirAsync(folderPath, { recursive: true });

    const localPath = path.join(folderPath, uuidv4());
    await writeFileAsync(localPath, Buffer.from(data, 'base64'));

    fileDoc.localPath = localPath;
    const result = await dbClient.createFile(fileDoc);
    const newFile = result.ops[0];

    return response.status(201).json(newFile);
  }
}

export default FilesController;