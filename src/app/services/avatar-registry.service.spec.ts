import { TestBed } from '@angular/core/testing';

import { AvatarRegistryService } from './avatar-registry.service';

describe('AvatarRegistryService', () => {
  let service: AvatarRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
