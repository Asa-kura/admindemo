<!--
  Component: Musiscope
  Description: Musiscope ties together the app and communicates with AudioRecorder
               and WaveViewer to make the app work.
-->
<template>
    <div class="musiscope">
        <div class="start-bts clearfix">
            <Button class="fb" size="large" @click="toggleRecord">{{ !recorder.recording ? '开始' : '停止' }}</Button>
            <Button size="large" :disabled="!recorder.buffers.length" @click="recorder.clear()">清除</Button>
            <Button size="large" :disabled="!recorder.buffers.length" @click="playClip">播放录音</Button>
        </div>
        <div class="audio-option clearfix">
            <h5>录音选项：</h5>
            <Button class="fb" :disabled="!selection" @click="playSelection(false)">播放</Button>
            <Button :disabled="!selection" @click="playSelection(20000)">循环20秒</Button>
            <Button :disabled="!selection" @click="playSelection(true)">循环</Button>
            <Button :disabled="!players.length" @click="stopAllPlayers()">停止播放</Button>
        </div>
        <wave-viewer :acx="acx" :buffers="recorder.buffers" @selection="setSelection" :recorder="recorder" />
        <div>
            <label>
                <Checkbox v-model="passthrough" />
                </Checkbox>
                <span>开启耳返</span>
            </label>
            <label>
                <div>麦克风收音大小：</div>
                <Slider @on-input="stepMicGain" :min="mic.min" :max="mic.max" :value="micget">
                </Slider>
                <span class="db">{{ mic.gain.toFixed(1) }} dB</span>
            </label>
        </div>
    </div>
</template>

<script>
    import AudioRecorder from '../../libs/AudioRecorder.js'
    import WaveViewer from '../WaveViewer.vue'

    export default {
        components: { WaveViewer },

        data: () => ({
            acx: null,
            audio: null,
            mic: {
                enabled: false,
                stream: null,
                gain: 0,
                min: -10,
                max: 10
            },
            micget: 0,
            monitor: null,
            passthrough: false,
            recorder: {
                recording: false
            },
            selection: null,
            players: []
        }),

        watch: {
            /**
             * @name passthrough()
             * @description updates the connection to play audio
             *
             * Parameters:  @param val - determines whether or not to connect or disconnect
             * Effects: Modifies this.monitor
             */
            passthrough(val) {
                // when passthrough changes, update monitor node connection
                if (val) {
                    // if (this.recorder.recording) {  // restart record and clear prev recording
                    //   this.recorder.record(this.monitor)
                    // }

                    // Connect the monitor node to dest node to enable mic monitoring
                    this.monitor.gain.value = 1
                    this.monitor.connect(this.acx.destination)
                } else {
                    this.monitor.disconnect(this.acx.destination)
                }
            }
        },

        /**
         * @name created()
         * @description is called upon creation of the Musiscope component.
         *              Sets up all Audio connections and AudioRecorder
         *
         * Effects: Instantiation. Effectively the Constructor
         */
        created() {
            // set up the audio context and nodes
            const AudioContext = window.AudioContext || window.webkitAudioContext
            this.acx = new AudioContext()

            this.input = this.acx.createGain()
            this.recorder = new AudioRecorder(this.acx, this.input)

            this.monitor = this.acx.createGain()
            this.input.connect(this.monitor)
        },

        methods: {
            /**
             * @name enableMic()
             * @description connects the mic to enable the app
             *
             * Effects: Modifies this.mic
             */
            async enableMic() {
                try {
                    // get mic stream and connect to input node
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                    this.mic.enabled = true
                    this.mic.stream = this.acx.createMediaStreamSource(stream)
                    this.mic.stream.connect(this.input)
                } catch (err) {
                    console.warn('Mic Error:', err)
                }
            },

            /**
             * @name toggleRecord()
             * @description toggles recording and interfaces with AudioRecorder
             *
             * Effects: Turns on or off recording via AudioRecorder
             */
            async toggleRecord() {
                // new Chrome policy https://goo.gl/7K7WLu
                await this.acx.resume()

                if (this.recorder.recording) {
                    // stop recording and mute input
                    if (this.passthrough) { // disconnect monitor in case mic monitor is on
                        this.recorder.stop(this.monitor)
                    } else {
                        this.recorder.stop()
                    }
                    this.input.gain.value = 0
                    return
                }

                // enable mic if disabled
                if (!this.mic.enabled) {
                    await this.enableMic()
                }

                // unmute input and start recording
                this.input.gain.value = 1

                // If mic monitor is on, record with the gainNode
                if (this.passthrough) {
                    this.recorder.record(this.monitor)
                } else {
                    this.recorder.record()
                }
            },

            /**
             * @name playClip()
             * @description interfaces with WebAudio to play the entire recorded audio clip
             *
             * Effects: The connected speaker will begin playing the clip
             */
            playClip() {
                // create a buffer source and copy whole clip
                const player = this.acx.createBufferSource()
                player.buffer = this.recorder.getBuffer()
                this.players.push(player)

                // connect to output and start
                player.connect(this.acx.destination)
                player.start()

                player.onended = () => {
                    // remove from players array and disconnect
                    this.players.splice(this.players.indexOf(player), 1)
                    player.disconnect()
                }
            },

            /**
             * @name playSeletion()
             * @description interfaces with WebAudio to play this.selection
             *
             * Parameters:  @param loop - Either a number or a boolean that determins how many ms to play
             *                            the clip. Simply pass in true to loop forever, or false to not loop
             * Effects: The connected speaker will begin playing this.selection
             */
            playSelection(loop) {
                const { start, end } = this.selection

                // create buffer source and copy selection
                const player = this.acx.createBufferSource()
                player.buffer = this.recorder.getBuffer(start, end)
                this.players.push(player)

                // connect to output, set loop, and start
                player.connect(this.acx.destination)
                player.loop = !!loop
                player.start()

                player.onended = () => {
                    // remove from players array and disconnect
                    this.players.splice(this.players.indexOf(player), 1)
                    player.disconnect()
                }

                if (typeof loop === 'number') {
                    // stop loop after loop ms
                    setTimeout(() => player.stop(), loop)
                }
            },

            /**
             * @name setSelection()
             * @description sets the selection to the new value, or to
             *              null if the passed selection has no duration
             *
             * Parameters:  @param selection - an object with two properties {start, end} to replace this.selection
             * Effects: Modifies this.selection if the passed selection has a duration
             */
            setSelection(selection) {
                const w = selection.end - selection.start
                this.selection = w ? selection : null
            },

            /**
             * @name stepMicGrain()
             * @description increases the mic gain, in centi-bels
             *
             * Parameters:  @param cB - the amount to increase the mic gain by (number in centi-bels)
             * Effects: Modifies this.mic and this.monitor
             */
            stepMicGain(value) {
                const { passthrough, mic, input } = this
                console.log('passthrough: ', passthrough)
                let cB = value
                mic.gain = parseInt(cB) / parseInt(mic.max)
                input.gain.value = 50 ** mic.gain
                console.log(input.gain.value)
            },

            /**
             * @name stopAllPlayers()
             * @description stops all playing audio clips
             *
             * Effects: Should turn off all audio output
             */
            stopAllPlayers() {
                while (this.players.length) {
                    const player = this.players.pop()
                    player.stop()
                    player.disconnect()
                }
            }
        }
    }
</script>

<style>
    button:hover span {
        font-weight: 700;
    }

    .ivu-layout-content {
        position: relative;
    }

    .musiscope {
        position: absolute;
        width: 512px;
        left: 50%;
        margin-left: -256px;
        /* border: 1px solid; */

    }

    .musiscope canvas {
        width: 512px;
        height: 512px;
    }

    .db {
        display: block;
        text-align: center;
        font-size: 15px;
    }

    .start-bts button {
        float: left;
        margin-left: 50px;
    }

    .start-bts .fb {

        margin-left: 0px;
    }

    .audio-option button {
        float: left;
        margin-left: 20px;
    }

    .audio-option .fb {

        margin-left: 0px;
    }

    .clearfix:after {
        content: "";
        display: block;
        height: 0;
        clear: both;
        visibility: hidden;
    }

    .clearfix {
        /*IE6、7专有*/
        *zoom: 1;
    }
</style>