const { spawn } = require('child_process');

class FFMPEG {
    #args = [];
    #options = {};
    #inputs = [];
    #filters = [];
    #activeStreams = [];
    #outputParams = [];

    /**
     * @param {Object} [options]
     * @param {string} [options.vcodec]
     * @param {Number} [options.crf]
     * @param {string} [options.pixfmt]
     * @param {boolean} [options.overwrite]
     * @param {boolean} [options.pipeOutput]
     */

    constructor (options = {}) {
        if (options.crf < 0 || options.crf > 51)
            throw new RangeError(`CRF value must be between 0 and 51. You provided ${options.crf}`)

        this.#options = {
            vcodec: 'libx264',
            crf: 18,
            pixfmt: 'yuv420p',
            overwrite: true,
            pipeOutput: false,
            ...options
        }

        this.#outputParams = [
            '-vcodec', this.#options.vcodec, 
            '-pix_fmt', this.#options.pixfmt, 
            '-crf', this.#options.crf
        ]

        if (this.#options.overwrite) this.#args.push('-y');
    }

    addInput(...path) { 
        path.forEach((p, idx) => {
            this.#args.push('-i', p);
            this.#inputs.push(p);
            this.#activeStreams.push(`[${idx}:v]`)
        });
        return this;
    }

    mapOutputs() {
        this.#activeStreams.forEach(stream => this.#args.push(
            ...this.#outputParams,
            '-map', stream, `${stream}.mp4`
        ));
        return this;
    }

    // FILTERS

    setFilterComplex() {
        if (this.#filters.length > 0) 
            this.#args.push('-filter_complex', this.#filters.join(';'), '-vsync', 2);
        return this;
    }

    addResizeFilter(width, height) {
        this.#activeStreams.forEach((stream, i) => {
            this.#filters.push(
                `${stream}scale=${width}:${height}:force_original_aspect_ratio=decrease,` + 
                `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[resized${i}]`
            )
        });

        const n = this.#activeStreams.length;
        this.#activeStreams = [];
        [...Array(n).keys()].forEach((_, i) => this.#activeStreams.push(`[resized${i}]`))
        return this;
    }

    addConcatFilter() {
        const n = this.#activeStreams.length;

        if (n < 2)
            throw new Error('You must add at least 2 inputs to use concat');

        this.#filters.push(`${this.#activeStreams.join('')}concat=n=${n}:v=1[concatenated]`);
        this.#activeStreams = ['[concatenated]'];

        return this;
    }

    run(callback) {//return console.log(this.#args.join(''))
        const child = spawn('ffmpeg', this.#args);
        if (this.#options.pipeOutput) child.stderr.pipe(process.stdout);
    
        return child.on('exit', function (code, signal) {
            console.log('ffmpeg child process exited with ' +
            `code ${code} and signal ${signal}`);
            if (callback) callback();
        });
    }
}

module.exports = FFMPEG;