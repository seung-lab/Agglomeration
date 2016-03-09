'use strict';

describe('Service: controlService', function () {

  // load the service's module
  beforeEach(module('cubeApp'));

  // instantiate service
  var controlService;
  beforeEach(inject(function (_controlService_) {
    controlService = _controlService_;
  }));

  it('should do something', function () {
    expect(!!controlService).toBe(true);
  });

});
