'use strict';

describe('Service: meshService', function () {

  // load the service's module
  beforeEach(module('cubeApp'));

  // instantiate service
  var meshService;
  beforeEach(inject(function (_meshService_) {
    meshService = _meshService_;
  }));

  it('should do something', function () {
    expect(!!meshService).toBe(true);
  });

});
