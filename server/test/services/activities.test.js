const assert = require('assert');
const app = require('../../npm/app');

describe('\'activities\' service', () => {
  it('registered the service', () => {
    const service = app.service('activities');

    assert.ok(service, 'Registered the service');
  });
});
