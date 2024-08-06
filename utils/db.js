import { MongoClient } from 'mongodb';

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
}

const dbClient = new DBClient();
export default dbClient;
