import '@testing-library/jest-dom';

// jsdom does not implement URL.createObjectURL / revokeObjectURL
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = (_blob: Blob) => `blob:mock-${Math.random()}`;
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = () => {};
}
