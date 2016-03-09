'use strict';

describe('Service: overlayService', function () {

  // load the service's module
  beforeEach(module('cubeApp'));

  // instantiate service
  var overlayService;
  beforeEach(inject(function (_overlayService_) {
    overlayService = _overlayService_;
  }));

  it('should do something', function () {
    expect(!!overlayService).toBe(true);
  });

});
