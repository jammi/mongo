import test from 'node:test';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { expect } from 'chai';

// import the connection manager wrapper
import { Conn } from '@jammi/mongo';

await test('Testing example usage from README.md', async t => {
  const mongod = await MongoMemoryServer.create();
  const connectionUrl = mongod.getUri();

  t.after(async () => {
    await mongod.stop();
  });

  await t.test('expect the test code to work as expected', async () => {

    // replace this with a valid mongodb url:
    const mongoUrl = connectionUrl;

    // initializes a connection manager wrapper for the collection 'testCollectionName'
    // - the first argument is the mongoDB URL and the second is optional, one of:
    //   - collection name as a string
    //   - object with collectionName as key and collection name as a string as the value
    //   - object with defaultCollectionName as key and collection name as a string as the value
    const testColl = await Conn(mongoUrl, 'testCollectionName');

    // inserts document into the collection 'testCollectionName' and returns its id
    const testId = await testColl(async coll => {
      const { insertedId: _id } = await coll.insertOne({number: 123});
      return _id;
    });

    let docCount = await testColl(async coll => coll.countDocuments());
    expect(docCount).to.be.a('number').that.equals(1);

    // returns the number inserted into the document by querying the document by its id:
    const { number: demoNum } = await testColl(
      async coll => coll.findOne({_id: testId})
    );

    // removes the document:
    await testColl(async coll => coll.deleteOne({_id: testId}));

    docCount = await testColl(async coll => coll.countDocuments());
    expect(docCount).to.be.a('number').that.equals(0);

    expect(demoNum).to.be.a('number').that.equals(123);
  });
});
