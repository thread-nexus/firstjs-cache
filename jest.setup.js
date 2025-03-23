// This file runs before Jest loads any tests
// Set up any global mocks or configurations here

// Increase timeout for async tests
jest.setTimeout(10000);

// Mock performance.now() if not available in test environment
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now()
  };
}

// Silence console errors/warnings during tests
// Comment these out if you need to debug test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('Warning:')) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('Warning:')) {
    return;
  }
  originalConsoleWarn(...args);
};

// Clean up function to restore console methods after tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});