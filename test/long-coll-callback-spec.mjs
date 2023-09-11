import { test } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { Conn } from '@jammi/mongo';

await test('long-running collection callbacks', async longrun => {
  const mongod = await MongoMemoryServer.create();
  const connectionUrl = mongod.getUri();

  await longrun.test('' +
      'makes a query take a long time, ' +
      'which will close the connection ' +
      'and cause issues if the bug still ' +
      'persists', async () => {
    const conn = Conn(connectionUrl, '__test');
    const promise = new Promise(async resolve => {
      await conn(async coll =>
        coll.insertOne({i: 100})
      );
      resolve();
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    await conn(async coll => {
      for (let i = 0; i < 100; i++) {
        await coll.insertOne({i});
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    });
    await promise;
  });

  await longrun.test('cleanup', async () => {
    const conn = Conn(connectionUrl + '&foo', '__test');
    await conn(async coll => {
      await coll.deleteMany({});
    });
  });

  await mongod.stop();
});
