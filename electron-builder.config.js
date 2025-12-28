/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "com.thomasbcox.writing-assistant",
  productName: "Thomas Writing Assistant",
  directories: {
    output: "release",
  },
  files: [
    "dist/**/*",
    "dist-electron/**/*",
    "package.json",
  ],
  mac: {
    category: "public.app-category.productivity",
    target: "dmg",
  },
  win: {
    target: "nsis",
  },
  linux: {
    target: "AppImage",
  },
};

