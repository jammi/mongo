import { MongoClient } from 'mongodb';

const isString = _ => typeof _ === 'string';
const isObject = _ => _ instanceof Object;

class MongoClientManager {
  #mongo;
  #opened;
  #clientCount;
  #_timeout;
  #closing;
  #connecting;
  #_connecting;
  #connectingResolve;
  constructor(url, connectOptions = {}) {
    this.#mongo = new MongoClient(url, connectOptions);
    this.#opened = false;
    this.#clientCount = 0;
    this.#_timeout = null;
    this.#closing = Promise.resolve();
    this.#connecting = new Promise(resolve => {
      this.#connectingResolve = resolve;
    });
    this.#_connecting = false;
    process.on('beforeExit', () => {
      this.#closeConnection();
    });
  }
  get client() {
    return this.#mongo;
  }
  get count() {
    return this.#clientCount;
  }
  get opened() {
    return this.#opened;
  }
  async reserve() {
    // cancel timing the connection out:
    if (this.#clientCount === 0) {
      clearTimeout(this.#_timeout);
    }
    await this.#closing;
    // special condition for first connection
    if (this.#_connecting && !this.#opened) {
      await this.#connecting;
    }
    if (!this.#opened) {
      this.#_connecting = true;
      await this.#mongo.connect();
      this.#connectingResolve();
      this.#opened = true;
      this.#_connecting = false;
    }
    this.#clientCount++;
  }
  free() {
    this.#clientCount--;
    if (this.#clientCount === 0) {
      clearTimeout(this.#_timeout);
      this.#_timeout = setTimeout(() => {
        if (this.#clientCount === 0) {
          this.#closeConnection();
        }
        else {
          throw new Error(`clientCount not 0: ${this.#clientCount}`);
        }
      }, 100);
    }
  }
  async #closeConnection() {
    await this.#closing;
    if (this.#opened) {
      // async wait for close setup
      let closingResolve;
      this.#closing = new Promise(resolve => {
        closingResolve = resolve;
      });

      await this.#mongo.close();

      // async wait for open setup
      this.#connecting = new Promise(
        resolve => {
          this.#connectingResolve = resolve;
        }
      );

      // set flags
      this.#opened = false;
      closingResolve();
    }
  }
  async closeAll() {
    clearTimeout(this.#_timeout);
    await this.#closeConnection();
  }

}

class ConnectionManager {
  #connections;
  constructor() {
    this.#connections = {};
  }
  open(url, options) {
    if (!this.#connections[url]) {
      this.#connections[url] = new MongoClientManager(url, options);
    }
    return this.#connections[url];
  }
  close(url) {
    this.#connections[url].free();
  }
}
const cm = new ConnectionManager();

class MongoConn {
  #mongoUrl;
  #collectionName;
  #conn;
  #options;

  get #client() {
    return this.#conn.client;
  }

  constructor(mongoUrl, optOrCollName) {
    let collectionName = null;
    let options = {};
    if (isString(optOrCollName)) {
      // legacy:
      collectionName = optOrCollName;
    }
    else if (isObject(optOrCollName)) {
      options = optOrCollName;
      collectionName = options.collectionName;
    }
    this.#options = options;
    this.#mongoUrl = mongoUrl;
    this.#collectionName = collectionName;
    this.#conn = cm.open(mongoUrl, options);
  }

  close() {
    cm.close(this.#mongoUrl);
  }

  async __internalState() {
    return {
      clientCount: this.#conn.count,
      opened: this.#conn.opened,
    };
  }

  async db() {
    await this.#conn.reserve();
    return this.#client.db();
  }

  async conn(collectionName) {
    const db = await this.db();
    return db.collection(collectionName || this.#collectionName);
  }

  async closeAll() {
    return this.#conn.closeAll();
  }
}

const Conn = (mongoUrl, options) => {
  const mongo = new MongoConn(mongoUrl, options);
  const defaultCollectionName =
    isString(options)
      ? options
      : isObject(options)
        ? options?.collectionName
          ? options.collectionName
          : options?.defaultCollectionName
            ? options.defaultCollectionName
            : null
        : null;
  return async (fn, collectionName = defaultCollectionName) => {
    if (!collectionName) {
      throw new Error(`No collectionName or defaultCollectionName for Conn of ${mongoUrl}!`);
    }
    try {
      const coll = await mongo.conn(collectionName);
      const result = await fn(coll);
      await mongo.close();
      return result;
    }
    catch (error) {
      const message = `Error encountered within mongo query ${mongoUrl}#${collectionName}`;
      // eslint-disable-next-line no-console
      console.trace({message, error, fn: fn.toString()});
      await mongo.close();
      throw new Error(message, {cause: error});
    }
  };
};

export { MongoConn, Conn };
export default Conn;
