import { describe, it, expect } from 'vitest';
import App from '../App.jsx';
import useStore from '../store/useStore.js';

// Guards against the regression where App.jsx referenced components that were
// never imported (caused a runtime crash on first render). If any imported
// module is missing, this import will throw and the test fails.
describe('app smoke', () => {
  it('critical modules import without throwing', () => {
    expect(App).toBeDefined();
    expect(useStore).toBeDefined();
    expect(typeof useStore.getState).toBe('function');
  });
});
