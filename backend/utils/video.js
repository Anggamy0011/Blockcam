const ffmpeg = require('fluent-ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

ffmpeg.setFfprobePath(ffprobeInstaller.path);

function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.log('ffprobe error:', err);
        return reject(err);
      }
      console.log('ffprobe metadata:', JSON.stringify(metadata, null, 2));
      resolve(metadata.format.duration);
    });
  });
}

module.exports = { getVideoDuration }; 