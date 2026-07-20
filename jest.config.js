/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  testPathIgnorePatterns: ["/node_modules/", "/mock-server/", "/.next/"],
  transform: {
    "^.+\\.(t|j)sx?$": ["babel-jest", { configFile: "./babel.config.jest.js" }],
  },
};
