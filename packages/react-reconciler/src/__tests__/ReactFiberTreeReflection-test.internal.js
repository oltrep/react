import {
  ClassComponent,
  HostRoot,
  FunctionComponent,
  SuspenseComponent,
} from '../ReactWorkTags';
import {NoFlags, Placement, Hydrating} from '../ReactFiberFlags';
import {set as setInstance} from 'shared/ReactInstanceMap';

let ReactFiberTreeReflection;

describe('ReactFiberTreeReflection', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactFiberTreeReflection = require('../ReactFiberTreeReflection');
  });

  describe('getSuspenseInstanceFromFiber', () => {
    let getSuspenseInstanceFromFiber;
    beforeEach(() => {
      getSuspenseInstanceFromFiber =
        ReactFiberTreeReflection.getSuspenseInstanceFromFiber;
    });

    const mockFiber = mock => {
      return {
        tag: SuspenseComponent,
        alternate: null,
        memoizedState: null,
        ...mock,
      };
    };

    it('returns the dehydrated memoized state from the fiber', () => {
      const suspenseInstance = {};
      const fiber = mockFiber({
        memoizedState: {
          dehydrated: suspenseInstance,
        },
      });
      expect(getSuspenseInstanceFromFiber(fiber)).toBe(suspenseInstance);
    });

    it('returns the dehydrated memoized state from the alternate fiber', () => {
      const suspenseInstance = {};
      const fiber = mockFiber({
        alternate: mockFiber({
          memoizedState: {
            dehydrated: suspenseInstance,
          },
        }),
      });
      expect(getSuspenseInstanceFromFiber(fiber)).toBe(suspenseInstance);
    });

    it('returns null if the fiber does not have the SuspenseComponent tag', () => {
      const fiber = mockFiber({
        tag: FunctionComponent,
      });
      expect(getSuspenseInstanceFromFiber(fiber)).toBeNull();
    });
  });

  describe('getContainerFromFiber', () => {
    let getContainerFromFiber;
    beforeEach(() => {
      getContainerFromFiber = ReactFiberTreeReflection.getContainerFromFiber;
    });

    const mockFiber = mock => {
      return {
        tag: HostRoot,
        ...mock,
      };
    };

    it('returns a container if fiber is a host root', () => {
      const container = {};
      const fiber = mockFiber({
        stateNode: {
          containerInfo: container,
        },
      });
      expect(getContainerFromFiber(fiber)).toBe(container);
    });

    it('returns null if the fiber is not a host root', () => {
      const fiber = mockFiber({
        tag: FunctionComponent,
      });
      expect(getContainerFromFiber(fiber)).toBeNull();
    });
  });

  describe('different fiber states', () => {
    const mockFiber = mock => {
      return {
        alternate: null,
        return: null,
        tag: FunctionComponent,
        flags: NoFlags,
        ...mock,
      };
    };
    let fiber;

    const generateIsFiberMounted = expected => {
      test(`isFiberMounted() is ${expected}`, () => {
        expect(ReactFiberTreeReflection.isFiberMounted(fiber)).toEqual(
          expected,
        );
      });
    };

    const generateIsMounted = expected => {
      test(`isMounted() is ${expected}`, () => {
        const component = function Component() {};
        setInstance(component, fiber);
        expect(ReactFiberTreeReflection.isMounted(component)).toEqual(expected);
      });
    };

    describe('with an alternate fiber', () => {
      describe('last return node has the HostRoot tag', () => {
        beforeEach(() => {
          const rootFiber = mockFiber({
            tag: HostRoot,
          });
          const middleFiber = mockFiber({
            return: rootFiber,
          });
          fiber = mockFiber({
            alternate: mockFiber(),
            return: middleFiber,
          });
        });

        generateIsFiberMounted(true);
        generateIsMounted(true);

        test('getNearestMountedFiber() returns the same fiber', () => {
          expect(ReactFiberTreeReflection.getNearestMountedFiber(fiber)).toBe(
            fiber,
          );
        });
      });

      describe('last return node does not have the HostRoot tag', () => {
        beforeEach(() => {
          const rootFiber = mockFiber();
          fiber = mockFiber({
            alternate: mockFiber(),
            return: rootFiber,
          });
        });

        test('getNearestMountedFiber() returns null', () => {
          expect(
            ReactFiberTreeReflection.getNearestMountedFiber(fiber),
          ).toBeNull();
        });

        test('findCurrentFiberUsingSlowPath() throws', () => {
          expect(() => {
            ReactFiberTreeReflection.findCurrentFiberUsingSlowPath(fiber);
          }).toThrow('Unable to find node on an unmounted component');
        });

        generateIsFiberMounted(false);
        generateIsMounted(false);
      });

      describe('fiber has the RootHost tag', () => {
        beforeEach(() => {
          fiber = mockFiber({
            alternate: mockFiber(),
            tag: HostRoot,
          });
        });

        test('getNearestMountedFiber() returns the same fiber', () => {
          expect(ReactFiberTreeReflection.getNearestMountedFiber(fiber)).toBe(
            fiber,
          );
        });

        test(
          'findCurrentFiberUsingSlowPath() returns the same fiber ' +
            'if the stateNode.current is the fiber',
          () => {
            fiber.stateNode = {
              current: fiber,
            };
            expect(
              ReactFiberTreeReflection.findCurrentFiberUsingSlowPath(fiber),
            ).toBe(fiber);
          },
        );

        test(
          'findCurrentFiberUsingSlowPath() returns the alternate fiber ' +
            'if the stateNode.current is not the given fiber',
          () => {
            fiber.stateNode = {
              current: null,
            };
            expect(
              ReactFiberTreeReflection.findCurrentFiberUsingSlowPath(fiber),
            ).toBe(fiber.alternate);
          },
        );

        generateIsFiberMounted(true);
        generateIsMounted(true);
      });
    });

    describe('without an alternate fiber', () => {
      describe('all its return nodes do not have the placement or hydrating flag', () => {
        beforeEach(() => {
          const rootFiber = mockFiber({
            tag: HostRoot,
          });
          const middleFiber = mockFiber({
            return: rootFiber,
          });
          fiber = mockFiber({
            return: middleFiber,
          });
        });

        test('getNearestMountedFiber() returns the same fiber', () => {
          expect(ReactFiberTreeReflection.getNearestMountedFiber(fiber)).toBe(
            fiber,
          );
        });

        test('findCurrentFiberUsingSlowPath() returns the same fiber', () => {
          expect(
            ReactFiberTreeReflection.findCurrentFiberUsingSlowPath(fiber),
          ).toBe(fiber);
        });

        generateIsFiberMounted(true);
        generateIsMounted(true);
      });

      const fiberFlags = {
        placement: Placement,
        hydrating: Hydrating,
      };

      Object.entries(fiberFlags).forEach(([name, flag]) => {
        describe(`one of the return node has the ${name} flag`, () => {
          let rootFiber;
          beforeEach(() => {
            rootFiber = mockFiber({
              tag: HostRoot,
            });
            const middleFiber = mockFiber({
              return: rootFiber,
              flags: flag,
            });
            fiber = mockFiber({
              return: middleFiber,
            });
          });

          test('getNearestMountedFiber() returns the parent fiber', () => {
            expect(ReactFiberTreeReflection.getNearestMountedFiber(fiber)).toBe(
              rootFiber,
            );
          });

          test('findCurrentFiberUsingSlowPath() returns null', () => {
            expect(
              ReactFiberTreeReflection.findCurrentFiberUsingSlowPath(fiber),
            ).toBeNull();
          });

          generateIsFiberMounted(false);
          generateIsMounted(false);
        });

        describe(
          `the return node of the fiber where it has the ${name} ` +
            'flag does not have the HostRoot tags',
          () => {
            beforeEach(() => {
              const rootFiber = mockFiber();
              const middleFiber = mockFiber({
                return: rootFiber,
                flags: flag,
              });
              fiber = mockFiber({
                return: middleFiber,
              });
            });

            test('getNearestMountedFiber() returns null', () => {
              expect(
                ReactFiberTreeReflection.getNearestMountedFiber(fiber),
              ).toBeNull();
            });

            test('findCurrentFiberUsingSlowPath() throws', () => {
              expect(() => {
                ReactFiberTreeReflection.findCurrentFiberUsingSlowPath(fiber);
              }).toThrow('Unable to find node on an unmounted component');
            });

            generateIsFiberMounted(false);
            generateIsMounted(false);
          },
        );
      });
    });
  });

  describe('isFiberSuspenseAndTimedOut', () => {
    let isFiberSuspenseAndTimedOut;
    beforeEach(() => {
      isFiberSuspenseAndTimedOut =
        ReactFiberTreeReflection.isFiberSuspenseAndTimedOut;
    });

    it(
      'is true for a SuspenseComponent fiber when' +
        'memoizedState.dehydrated is null',
      () => {
        const fiber = {
          tag: SuspenseComponent,
          memoizedState: {dehydrated: null},
        };
        expect(isFiberSuspenseAndTimedOut(fiber)).toEqual(true);
      },
    );

    it('is false if the fiber is not tagged as SuspenseComponent', () => {
      const fiber = {
        tag: ClassComponent,
        memoizedState: {dehydrated: null},
      };
      expect(isFiberSuspenseAndTimedOut(fiber)).toEqual(false);
    });

    it('is false if the fiber does not have memoizedState', () => {
      const fiber = {
        tag: SuspenseComponent,
        memoizedState: null,
      };
      expect(isFiberSuspenseAndTimedOut(fiber)).toEqual(false);
    });

    it('is false if the fiber memoizedState.dehydrated is not null', () => {
      const fiber = {
        tag: SuspenseComponent,
        memoizedState: {dehydrated: 'foo'},
      };
      expect(isFiberSuspenseAndTimedOut(fiber)).toEqual(false);
    });
  });

  describe('doesFiberContain', () => {
    let doesFiberContain;
    beforeEach(() => {
      doesFiberContain = ReactFiberTreeReflection.doesFiberContain;
    });

    const mockFiber = mock => {
      return {
        return: null,
        alternate: null,
        ...(mock || {}),
      };
    };

    it('is true if the parent and the child are the same fiber', () => {
      const fiber = mockFiber();
      expect(doesFiberContain(fiber, fiber)).toEqual(true);
    });

    it('is true if the parent alternate and the child are the same fiber', () => {
      const fiber = mockFiber();
      const parent = mockFiber({
        alternate: fiber,
      });
      expect(doesFiberContain(parent, fiber)).toEqual(true);
    });

    it('is true if the child return node and the parent are the same fiber', () => {
      const parent = mockFiber();
      const child = mockFiber({
        return: parent,
      });
      expect(doesFiberContain(parent, child)).toEqual(true);
    });

    it('is true if the child return node and the parent alternate are the same fiber', () => {
      const parentAlternate = mockFiber();
      const parent = mockFiber({
        alternate: parentAlternate,
      });
      const child = mockFiber({
        return: parentAlternate,
      });
      expect(doesFiberContain(parent, child)).toEqual(true);
    });

    it('is false if none of the child parents are the parent fiber', () => {
      const parent = mockFiber();
      const child = mockFiber();
      expect(doesFiberContain(parent, child)).toEqual(false);
    });
  });
});
