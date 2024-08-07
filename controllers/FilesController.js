import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

class FilesController {
  static async postUpload(request, response) {
    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileDetails = request.body;

    if (!fileDetails.name) {
      return response.status(400).json({ error: 'Missing name' });
    }

    if (!fileDetails.type || !['folder', 'file', 'image'].includes(fileDetails.type)) {
      return response.status(400).json({ error: 'Missing type' });
    }

    if (!fileDetails.data && fileDetails.type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }

    if (fileDetails.parentId !== 0 && fileDetails.parentId) {
      const parentFile = await dbClient.getFileById(fileDetails.parentId);
      if (!parentFile) {
        return response.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDoc = {
      userId: user._id,
      name: fileDetails.name,
      type: fileDetails.type,
      isPublic: fileDetails.isPublic || false,
      parentId: fileDetails.parentId || 0,
    };

    if (fileDetails.type === 'folder') {
      const resultFolder = await dbClient.createFile(fileDoc);
      return response.status(201).json(resultFolder.ops[0]);
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    await mkdirAsync(folderPath, { recursive: true });

    const localPath = path.join(folderPath, uuidv4());
    await writeFileAsync(localPath, Buffer.from(fileDetails.data, 'base64'));

    fileDoc.localPath = localPath;
    const result = await dbClient.createFile(fileDoc);
    const newFile = result.ops[0];

    return response.status(201).json(newFile);
  }

  static async getShow(request, response) {
    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const file = await dbClient.getFileById(fileId);

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    if (file.userId.toString() !== userId) {
      return response.status(404).json({ error: 'Not found' });
    }

    return response.status(200).json(file);
  }

  static async getIndex(request, response) {
    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { query } = request;

    if (Object.keys(query).length < 1) {
      const allFiles = await dbClient.getAllFiles();
      return response.status(200).json(allFiles);
    }

    const parentId = (request.query.parentId && request.query.parentId !== '0') || 0;
    const page = request.query.page || 0;

    const pageSize = 20;
    const skip = parseInt(page, 10) * pageSize;

    const fileColl = dbClient.db.collection('files');
    const files = await fileColl.aggregate([
      { $match: { userId: user._id, parentId } },
      { $skip: skip },
      { $limit: pageSize },
    ]).toArray();

    return response.status(200).json(files);
  }

  static async putPublish(request, response) {
    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const file = await dbClient.getFileById(fileId);

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    if (file.userId.toString() !== userId) {
      return response.status(404).json({ error: 'Not found' });
    }

    await dbClient.updateFile(file, { isPublic: true });
    return response.status(200).json(await dbClient.getFileById(fileId));
  }

  static async putUnpublish(request, response) {
    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.getUserById(userId);

    if (user == null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const file = await dbClient.getFileById(fileId);

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    if (file.userId.toString() !== userId) {
      return response.status(404).json({ error: 'Not found' });
    }

    await dbClient.updateFile(file, { isPublic: false });
    return response.status(200).json(await dbClient.getFileById(fileId));
  }

  static async getFile(request, response) {
    const fileId = request.params.id;
    const file = await dbClient.getFileById(fileId);

    const xToken = request.get('X-Token');
    const userId = await redisClient.get(`auth_${xToken}`);

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }
    // const user = await dbClient.getUserById(userId);

    if (file.type === 'folder') {
      return response.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    if (file.isPublic === false && file.userId.toString() !== userId) {
      return response.status(404).json({ error: 'Not found' });
    }

    if (!fs.existsSync(file.localPath)) {
      return response.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name);
    const fileData = await readFileAsync(file.localPath);

    response.setHeader('Content-Type', mimeType);
    return response.status(200).send(fileData);
  }
}

export default FilesController;
