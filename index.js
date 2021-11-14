const FFMPEG = require('./ffmpeg')

const inputs = [
    "./1.mp4",
    "./2.mp4",
    "./3.mp4"
]

// resizes video files and concatenates them
new FFMPEG({
    overwrite: true,
    crf: 40,
    pipeOutput: false
})
    .addInput(...inputs)
    .addResizeFilter(1920, 1080)
    .addConcatFilter()
    .setFilterComplex()
    .mapOutputs()
    .run(() => {
        console.log("Done");
    });

