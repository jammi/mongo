import { describe, it, before } from 'node:test';
import { expect } from 'chai';

describe('@jammi/mongo sanity test', async () => {
  let MongoConn;
  let Conn;
  before(async () => {
    ({ MongoConn, Conn } = await import('@jammi/mongo'));
  });
  it('checks MongoConn is a function', () => {
    expect(typeof MongoConn).to.eql('function');
  });
  it('checks Conn is a function', () => {
    expect(typeof Conn).to.eql('function');
  });
});
