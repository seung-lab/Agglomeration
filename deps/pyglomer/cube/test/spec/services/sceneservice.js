'use strict';

describe('Service: sceneService', function () {

  // load the service's module
  beforeEach(module('cubeApp'));

  // instantiate service
  var sceneService;
  beforeEach(inject(function (_sceneService_) {
    sceneService = _sceneService_;
  }));

  it('should do something', function () {
    expect(!!sceneService).toBe(true);
  });

});
