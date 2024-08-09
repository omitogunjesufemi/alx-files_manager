import { MongoClient, ObjectID } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.client.connect();
    this.db = this.client.db(this.database);
  }

  isAlive() {
    // check whether connection is successful
    return this.client.isConnected();
  }

  async nbUsers() {
    // returns the number of documents in collection `users`
    if (this.isAlive() === false) {
      return 0;
    }
    const noOfUsers = await this.db.collection('users').countDocuments();
    if (Object.entires(noOfUsers).length === 0) {
      return 0;
    }
    return noOfUsers;
  }

  async nbFiles() {
    // returns the number of documents in the collection `files`
    if (this.isAlive() === false) {
      return 0;
    }
    const noOfFiles = await this.db.collection('files').countDocuments();
    return noOfFiles;
  }

  async getUserById(userId) {
    const users = this.db.collection('users');
    const user = await users.findOne({ _id: new ObjectID(userId) });
    return user;
  }

  async getFileById(fileId) {
    const files = this.db.collection('files');
    const file = await files.findOne({ _id: new ObjectID(fileId) });
    return file;
  }

  async createFile(fileDocument) {
    const fileCollections = this.db.collection('files');
    const result = await fileCollections.insertOne(fileDocument);
    return result;
  }

  async getAllFiles() {
    const collections = this.db.collection('files');
    const files = await collections.find({}).toArray();
    return files;
  }

  async updateFile(fileDoc, newUpdate) {
    const fileCollections = this.db.collection('files');
    const result = await fileCollections.updateOne(fileDoc, { $set: newUpdate });
    return result;
  }
}

const dbClient = new DBClient();
export default dbClient;
