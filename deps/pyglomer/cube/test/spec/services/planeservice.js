'use strict';

describe('Service: planeService', function () {

  // load the service's module
  beforeEach(module('cubeApp'));

  // instantiate service
  var planeService;
  beforeEach(inject(function (_planeService_) {
    planeService = _planeService_;
  }));

  it('should do something', function () {
    expect(!!planeService).toBe(true);
  });

});
