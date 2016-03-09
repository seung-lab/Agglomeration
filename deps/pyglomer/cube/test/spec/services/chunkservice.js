'use strict';

describe('Service: chunkService', function () {

  // load the service's module
  beforeEach(module('cubeApp'));

  // instantiate service
  var chunkService;
  beforeEach(inject(function (_chunkService_) {
    chunkService = _chunkService_;
  }));

  it('should do something', function () {
    expect(!!chunkService).toBe(true);
  });

});
