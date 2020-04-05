const fs = require("fs");
const https = require("http");

export const saveImageToDisk = (url, localPath) => {
  let file = fs.createWriteStream(localPath);
  https.get(url, function (response) {
    response.pipe(file);
  });
};
