import { describe, it, before, after } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { expect } from 'chai';
import { MongoConn, Conn } from '@jammi/mongo';

const numbers = [
  'zero', 'one', 'two', 'three', 'four',
  'five', 'six', 'seven', 'eight', 'nine', 'ten'
];

const testDoc = (doc, number, word, i) => {
  expect(doc)
    .to.be.an('object')
    .that.has.property('word')
    .that.is.a('string')
    .that.equals(word);

  expect(doc)
    .to.have.property('number')
    .that.is.a('number')
    .that.equals(number, 'number')
    .that.equals(i, 'i');
};

describe('@jammi/mongo test suite', async () => {
  let mongod;
  let connectionUrl;
  before(async () => {
    mongod = await MongoMemoryServer.create();
    connectionUrl = mongod.getUri();
  });
  after(async () => {
    await mongod.stop();
  });

  it('checks MongoConn class sanity check (shouldn\'t throw exceptions)', async () => {
    const mongo = new MongoConn(connectionUrl, '__test');
    await mongo.conn();
    mongo.close();
  });

  [1, 2, 3, 4].forEach(runNumber => {
    describe(`Conn from export destructor insert many in parallel, run ${runNumber} of 4`, async () => {

      let mongo;
      before(async () => {
        await Conn(connectionUrl)(coll => coll.deleteMany({}), '__test');
        mongo = Conn(connectionUrl, '__test');
      });

      after(async () => {
        expect(
          await Conn(connectionUrl)(coll => coll.countDocuments({}), '__test'),
          'previous test should clean up after itself')
          .to.equal(0, 'document count');
      });

      it('ensures the __test collection is empty', async () => {
        const initialCount = await mongo(coll => coll.countDocuments({}));
        expect(initialCount, '__test collection should be empty').to.equal(0);
      });

      let testData;
      it('inserts 11 documents into __test and verifies they are inserted', async () => {
        testData = await Promise.all(
          numbers.map(async (word, number) =>
            mongo(async coll => {
              const { insertedId } = await coll.insertOne({ word, number });
              return { insertedId, word, number };
            })
          )
        );
        const insertCount = await mongo(coll => coll.countDocuments({}));
        expect(insertCount, '__test collection should have 11 elements').to.equal(11);
      });

      it('verifies the 11 inserted documents have the values they should have', async () => {
        await Promise.all(testData
          .map(async ({ insertedId, word, number }, i) =>
            mongo(async coll => {
              const doc = await coll.findOne({ _id: insertedId });
              testDoc(doc, number, word, i);
            })
          )
        );
      });

      it('verifies the 11 inserted documents have the ids they should have', async () => {
        const allDocuments = await mongo(coll => coll
          .find({}, { sort: [['number', 1]] })
          .toArray()
        );
        expect(allDocuments)
          .to.be.an('array')
          .that.has.length(11);
        allDocuments.forEach(async (doc, i) => {
          const { insertedId, word, number } = testData[i];
          testDoc(doc, number, word, i);
          expect(insertedId.toString())
            .to.equal(doc._id.toString());
        });
      });

      it('verifies the 11 inserted documents all get deleted', async () => {
        await mongo(coll => coll.deleteMany({}));
        const finalCount = await mongo(coll => coll.countDocuments({}));
        expect(finalCount, '__test collection should be empty').to.equal(0);
      });
    });

    describe(`MongoConn insert many in parallel, run ${runNumber} of 4`, () => {

      let mongo;
      before(async () => {
        mongo = new MongoConn(connectionUrl, '__test');
      });

      after(async () => {
        await mongo.closeAll();
      });

      let allColl;
      it('ensures the __test collection is empty', async () => {
        allColl = await mongo.conn();
        const initialCount = await allColl.countDocuments({});
        expect(initialCount, '__test collection should be empty').to.equal(0);
      });

      let testData;
      it('inserts 11 documents into __test and verifies they are inserted', async () => {
        testData = await Promise.all(numbers.map(async (word, number) => {
          const coll = await mongo.conn();
          const { insertedId } = await coll.insertOne({ word, number });
          await mongo.close();
          return { insertedId, word, number };
        }));
        const insertCount = await allColl.countDocuments({});
        expect(insertCount, '__test collection should have 11 elements').to.equal(11);
      });

      it('verifies the 11 inserted documents have the values they should have', async () => {
        await Promise.all(testData.map(async ({ insertedId, word, number }, i) => {
          const coll = await mongo.conn();
          const doc = await coll.findOne({ _id: insertedId });
          await mongo.close();
          testDoc(doc, number, word, i);
        }));
      });

      it('verifies the 11 inserted documents have the ids they should have', async () => {
        await Promise.all(
          (await allColl.find({}, { sort: [['number', 1]] }).toArray())
            .map((doc, i) => {
              const { insertedId, word, number } = testData[i];
              testDoc(doc, number, word, i);
              expect(insertedId.toString()).to.equal(doc._id.toString());
            })
        );
      });

      it('verifies the 11 inserted documents all get deleted', async () => {
        await allColl.deleteMany({});
        const finalCount = await allColl.countDocuments({});
        expect(finalCount, '__test collection should be empty').to.equal(0);
        await mongo.close();
      });

      it('verifies the internal state matches what it should be when the system is closed', async () => {
        await new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const internalState = await mongo.__internalState();
              expect(internalState, 'internal state clientCount')
                .to.be.an('object')
                .that.has.property('clientCount')
                .that.equals(0);

              expect(internalState, 'internal state opened')
                .to.have.property('opened')
                .that.equals(false);
              resolve();
            }
            catch (error) {
              reject(error);
            }

          }, 200);
        });
      });
    });
  });
});
