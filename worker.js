import fs from 'fs';
import promisify from 'util';
import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    return done(new Error('Missing fieldId'));
  }

  if (!userId) {
    return done(new Error('Missing userId'));
  }

  const file = await dbClient.getFileById(fileId);

  if (!file || file.userId.toString() !== userId) {
    return done(new Error('File not found'));
  }

  const fileData = await readFileAsync(file.localPath);
  const thumbnail1 = await imageThumbnail(fileData, { width: 500 });
  const thumbnail2 = await imageThumbnail(fileData, { width: 200 });
  const thumbnail3 = await imageThumbnail(fileData, { width: 100 });

  await writeFileAsync(`${file.localPath}_500`, thumbnail1);
  await writeFileAsync(`${file.localPath}_200`, thumbnail2);
  await writeFileAsync(`${file.localPath}_100`, thumbnail3);

  return done();
});
