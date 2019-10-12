function toWav(opts, data) {
    var numFrames = data.byteLength / opts.bytesPerSample;
    var numChannels = opts.numChannels || 1;
    var sampleRate = opts.sampleRate || 44100;
    var bytesPerSample = opts.bytesPerSample || 2;
    var blockAlign = numChannels * bytesPerSample;
    var byteRate = sampleRate * blockAlign;
    var dataSize = numFrames * blockAlign;
    dataSize = data.byteLength;

    var buffer = new ArrayBuffer(44);
    var dv = new DataView(buffer);

    var p = 0;

    function writeString(s) {
        for (var i = 0; i < s.length; i++) {
            dv.setInt8(p + i, s.charCodeAt(i));
        }
        p += s.length;
    }

    function writeUint32(d) {
        dv.setInt32(p, d, true);
        p += 4;
    }

    function writeUint16(d) {
        dv.setInt16(p, d, true);
        p += 2;
    }

    writeString('RIFF');              // ChunkID
    writeUint32(dataSize + 36);       // ChunkSize
    writeString('WAVE');              // Format
    writeString('fmt ');              // Subchunk1ID
    writeUint32(16);                  // Subchunk1Size
    writeUint16(1);                   // AudioFormat
    writeUint16(numChannels);         // NumChannels
    writeUint32(sampleRate);          // SampleRate
    writeUint32(byteRate);            // ByteRate
    writeUint16(blockAlign);          // BlockAlign
    writeUint16(bytesPerSample * 8);  // BitsPerSample
    writeString('data');              // Subchunk2ID
    writeUint32(dataSize);            // Subchunk2Size

    var header = new Int8Array(buffer);
    var pcm = new Int8Array(data);
    var wav = new Int8Array(header.byteLength + pcm.byteLength);
    wav.set(header);
    wav.set(pcm, header.byteLength);
    return wav.buffer;
}