/**
 * AudioRecorder is used to record and store all audio data.
 * Directly interfaces with WebAudio (https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
 */
export default class AudioRecorder {
  /**
   * @name constructor()
   * @description instantiates the object and initializes all variables
   *
   * Parameters:  acx - the AudioContext object to create everything off of
   *              input - GainNode object that represents a change in volume
   * Effects: Instantiation
   */
  constructor (acx, input) {
    this.acx = acx
    this.input = input
    this.buffers = []
    this.clip = null
    this.processor = null
    this.recording = false
  }

  /**
   * @name record()
   * @description starts recording audio; erases any prior saved audio
   *
   * Parameters: @param gainNode Pass in the gainNode for when mic monitor with gain is enabled.
   *                             Null otherwise.
   * Effects: Stores saved audio into the buffers object
   */
  record (gainNode = null) {
    if (this.recording) {
      this.stop()
    }

    this.clear()
    this.recording = true

    // processor node with default sampleRate, and 1 channel i/o
    this.processor = this.acx.createScriptProcessor(undefined, 1, 1)
    // Stream in input data from gainNode to reflect gain in waveViewer
    if (gainNode) {
      gainNode.connect(this.processor)
    } else {
      this.input.connect(this.processor)
    }
    this.processor.connect(this.acx.destination)

    this.processor.onaudioprocess = e => {
      // get copy of buffer and add to all buffers
      const buffer = e.inputBuffer.getChannelData(0).slice()

      if (this.onData) {
        const last = this.buffers[this.buffers.length - 1] || 0
        this.onData(last, buffer)
      }

      this.buffers.push(buffer)
    }
  }
  /**
   * @name clear()
   * @description wipes all saved audio data
   *
   * Effects: Clears buffers and clip
   */
  clear () {
    this.clip = null
    this.buffers = []
  }

  /**
   * @name stop()
   * @description halts recording completely, but does not clear the saved data
   * Parameters: @param gainNode Pass in the gainNode for when mic monitor with gain is enabled.
   *                             Null otherwise.
   * Effects: Disconnects and stops the recording
   */
  stop (gainNode = null) {
    this.recording = false
    this.processor.disconnect()
    if (gainNode) {
      gainNode.disconnect(this.processor)
    } else {
      this.input.disconnect(this.processor)
    }
    this.processor = null
  }

  /**
   * @name createClip()
   * @description concatenates all saved buffers into single AudioBuffer object
   *
   * Effects: Saves the complete AudioBuffer object into clip
   */
  createClip () {
    if (!this.buffers.length) return

    const bufLen = this.buffers[0].length
    const length = this.buffers.length * bufLen

    this.clip = this.acx.createBuffer(1, length, this.acx.sampleRate)

    for (let i = 0; i < this.buffers.length; i++) {
      const tmp = this.buffers[i]
      const pos = i * bufLen
      this.clip.copyToChannel(tmp, 0, pos)
    }
  }

  /**
   * @name getBuffer()
   * @description returns the specific partion of the audio clip
   *
   * Parameters:  @param start - the starting sample of the desired clip
   *              @param end   - the ending sample of the desired clip
   * @returns An AudioBuffer object containing the requested audio data
   */
  getBuffer (start, end) {
    if (!this.clip) this.createClip()

    start = start || 0
    end = end || this.clip.length

    const data = this.clip.getChannelData(0).slice(start, end)
    const buf = this.acx.createBuffer(1, end - start, this.acx.sampleRate)
    buf.copyToChannel(data, 0, 0)

    return buf
  }
}
