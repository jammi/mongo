# Jammi's MongoDB wrapper

This is a minimalist MongoDB client wrapper that has a state engine for managing opening and closing connections, and running calls within async callbacks.

This is intended for minimal dependencies, so the only thing it depends on is the official mongodb node driver.


## Sample usage:

```js

// import the connection manager wrapper
import { Conn } from '@jammi/mongo';

// replace this with a valid mongodb url:
const mongoUrl = 'mongodb://user:pass@host.tld/database';

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

const docCount = await testColl(async coll => coll.countDocuments());

// returns the number inserted into the document by querying the document by its id:
const { number: demoNum } = await testColl(
  async coll => coll.findOne({_id: testId})
);

// removes the document:
await testColl(async coll => coll.deleteOne({_id: testId}));

// connections are automatically closed soon after the last access has been made
```


## Contributing

Just use the normal Github workflow of forking and providing a pull request.

To setup the dependencies, clone the repository locally and run:
```sh
npm install
```

Then, check if the tests pass:
```sh
npm test
```

Tests should be added into the `test` directory and their filename should end with `-spec.mjs`.

Tests should be written to be compatible `node:test` runner.

Tests should not add new dependencies.

Tests should avoid adding new development dependencies.

Tests should run against `mongodb-memory-server`.


### If your patch fixes or exposes a bug:

1. Make a new test that exposes the bug, and expects it to be fixed.
2. Name your branch `fix/description` where "description" is a brief description of the issue.


### If your patch adds a new feature:

1. Make new tests that show the expected use of the feature.
2. Make new tests that exposes the expected usage or environmental errors and how to handle them.
3. Name your branch 'feature/description' where "description" is a brief description of the feature.


### If your patch adds documentation:

1. Write documentation as either code comments, patches to this README.md document, or new documents in a `doc` folder.
2. Name your branch 'doc/description' where "description" is a brief description of your additions or changes.


Ensure all tests pass before opening a pull request!
