<!--
  Component: WaveViewer
  Description: WaveViewer contains the actual visualization of the audio recorded, and handles all
               events related to controlling how you interact with the visualization.
-->

<template>
  <div class="wave-viewer">
    <canvas ref="cv" width="512" height="512" @mousewheel="mousewheel" @mousedown="mousedown" @mousemove="mousemove"
      @mouseup="mouseup"></canvas>
    <div>
      <input @input="timeSliderInput" type="range" min="0" max="53" value="0">
      <button @click="skip(-128)">&lt;&lt;</button>
      <button @click="skip(-16)">&lt;</button>
      <button @click="skip(16)">&gt;</button>
      <button @click="skip(128)">&gt;&gt;</button>
      <button :disabled="this.recorder.recording" @click="
          end = bufLen
          render()
        ">
        live
      </button>
    </div>
    <div>
      <label>
        <input type="checkbox" v-model="lockWave" />
        <span>lock wave</span>
      </label>
    </div>
  </div>
</template>

<script>
  /* eslint-disable */
  const { abs, ceil, floor, max, min, pow } = Math
  const clamp = (x, minX, maxX) => max(minX, min(maxX, x))

  export default {
    props: ['acx', 'buffers', 'recorder'],

    data: () => ({
      cv: null,
      ctx: null,
      bufLen: 0,
      end: 0,
      scale: 0.003906252, // data points per pixel
      lockWave: true,
      selection: {
        start: 0,
        end: 0
      },
      timeSliderValue: 50
    }),

    computed: {
      /**
       * @name start()
       * @description calculates the property value for start anytime it is referenced
       *
       * @returns the value of start
       */
      start() {
        const { cv, end, scale } = this
        return max(0, end - ceil(cv.width / scale) - 1)
      }
    },

    /**
     * @name mounted()
     * @description mounted() is called upon component mount (lifecycle method)
     *
     * Effects: Sets up the JS Canvas, calls render().
     */
    mounted() {
      this.cv = this.$refs.cv
      this.ctx = this.cv.getContext('2d')

      const { cv, ctx } = this

      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#fff'
      ctx.fillStyle = '#000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.translate(0, cv.height / 2)
      this.render()
    },

    methods: {
      /**
       * @name timeSliderInput()
       * @description handles all input changes for the time slider
       *              Modifies the zoom level for the graph
       * Parameters:  e - the event object trigged from the input event.
       * Effects: Alters zoom of the graph, calls zoom()
       */
      timeSliderInput(e) {
        this.scale = 0.003906252
        this.zoom(16 * e.target.value)
      },

      /**
       * @name mousedown()
       * @description mousedown() handles all mouse down events on the JS Canvas.
       *               This handles dragging events and sets clip selection data
       *
       * Parameters:  @param e - the event object trigged from the mousedown event.
       * Effects: Initiates dragging and sets selection information, calls render()
       */
      mousedown(e) {
        this.dragging = true
        this.selection.start = this.start + e.offsetX / this.scale
        this.selection.end = this.selection.start

        this.render()
      },

      /**
       * @name mousemove()
       * @description mousemove() handles all mouse move events on the JS Canvas.
       *               This handles dragging events and sets clip selection data
       *
       * Parameters:  @param e - the event object trigged from the mousemove event.
       * Effects: Sets selection information, calls render()
       */
      mousemove(e) {
        if (!this.dragging) return

        const i = this.start + e.offsetX / this.scale
        if (i > this.selection.start) {
          this.selection.end = i
        } else {
          this.selection.start = i
        }

        this.render()
      },

      /**
       * @name mouseup()
       * @description mouseup() handles all mouse up events on the JS Canvas.
       *               This handles dragging events and sets clip selection data
       *
       * Parameters:  @param e - the event object trigged from the mouseup event.
       * Effects: Turns off dragging, triggers setSelection() in Musiscope
       */
      mouseup() {
        this.dragging = false
        this.$emit('selection', this.selection)
      },

      /**
       * @name mousewheel()
       * @description mousewheel() handles all mouse scroll events on the JS Canvas.
       *               This alters the zoom and/or the position on the graph
       *
       * Parameters:  @param e - the event object trigged from the mousewheel event.
       * Effects: Alters zoom and/or viewable region of the graph
       */
      mousewheel(e) {
        if (!this.buffers || !this.buffers.length) return

        e.preventDefault()

        let { deltaX, deltaY } = e

        // lock scrolling to 1 axis
        if (abs(deltaX) >= abs(deltaY)) this.skip(deltaX)
        if (abs(deltaY) >= abs(deltaX)) this.zoom(deltaY)
      },

      /**
       * @name zoom()
       * @description zoom() scales in or out of the graph
       *
       * Parameters:  @param delta - a positive or negative numerical
       *                             value that determines which way to zoom
       * Effects: Alters zoom of the graph, calls render()
       */
      zoom(delta) {
        const { cv, bufLen, start, end, scale } = this

        this.scale = clamp(scale * pow(1.01, delta), 1 / 256, 16)
        if (!this.recorder.recording) {
          const diff = this.start - start
          const minEnd = min(cv.width / scale, bufLen)
          this.end = clamp(floor(end - diff / 2), minEnd, bufLen)
        }
        this.render()
      },

      /**
       * @name skip()
       * @description skip() moves the viewable region of the graph forward or backward
       *
       *
       * Parameters:  @param delta - a positive or negative numerical
       *                             value that determines which way to skip
       * Effects: Alters the viewable region of the graph, calls render()
       */
      skip(delta) {
        const { cv, bufLen, end, scale } = this

        // clamp end to ensure a full frame shows
        const minEnd = min(cv.width / scale, bufLen)
        this.end = clamp(floor(end + delta / scale), minEnd, bufLen)

        if (this.end !== end) this.render()
      },

      /**
       * @name update()
       * @description update() is called whenever there is a change to
       *               buffers, the audio data
       *
       * Parameters:  @param buffers - the audio data
       * Effects: Changes all features of the graph, calls render()
       */
      update(buffers) {
        if (!buffers || !buffers.length) {
          this.selection.start = 0
          this.selection.end = 0
          this.bufLen = 0
          this.end = 0
          this.render()
          return
        }

        const { bufLen, end, scale } = this
        const newBufLen = buffers.length * buffers[0].length

        // auto scroll if scrolled to end
        if (abs(end - bufLen) < 64 / scale || bufLen > newBufLen) {
          this.end = newBufLen
        }

        this.bufLen = newBufLen
        this.render()
      },

      /**
       * @name render()
       * @description render() displays the graph
       *
       * Effects: Changes the canvas to let you view the waves
       */
      render() {
        const { cv, ctx, buffers, bufLen, start, end, scale, selection } = this
        const len = end - start
        // clear canvas with black
        ctx.fillStyle = '#000'
        ctx.fillRect(0, -cv.height / 2, cv.width, cv.height)

        this.renderScale()

        if (!buffers.length) return

        const getData = i => {
          const buf = floor(i / buffers[0].length)
          const j = i % buffers[0].length
          return buffers[buf] ? buffers[buf][j] : 0
        }

        // zoomed in line drawing
        if (scale > 1 / 32) {
          let maxv = -Infinity
          let maxi = 0

          // if lock wave, find max in last full chunk
          if (this.lockWave && end === bufLen) {
            for (let i = 0; i < buffers[0].length; i++) {
              if (end - i < 0) break

              const value = getData(end - i)
              if (value > maxv) {
                maxv = value
                maxi = i
              }
            }
          }

          ctx.beginPath()
          for (let i = 0; i < len; i++) {
            // shift data by maxi for wave lock
            const value = getData(start + i - maxi)

            const x = i * scale
            const y = 100 * value

            ctx[i === 0 ? 'moveTo' : 'lineTo'](x, y)
          }
          ctx.stroke()
        }

        // zoomed out optimized rectangle drawing
        else {
          ctx.fillStyle = '#fff'

          // break data into chunks based on zoom
          const chunk = floor(1 / scale)
          for (let i = 0; i < len; i += chunk) {
            let minv = Infinity
            let maxv = -Infinity

            // get min and max of chunk
            for (let j = 0; j < chunk; j++) {
              const value = 100 * getData(start + i + j)
              if (value < minv) minv = value
              if (value > maxv) maxv = value
            }

            // draw rectangle between min and max
            ctx.fillRect(i * scale, minv - 1, 2, maxv - minv + 2)
          }
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'

        // render selection if part is in view
        if (selection.start < end && selection.end > start) {
          const x = (selection.start - start) * scale
          const w = (selection.end - selection.start) * scale

          ctx.fillRect(x, -cv.height / 2, w, cv.height)
        }
      },

      /**
       * @name renderScale()
       * @description renderScale() displays a time scale on the graph
       *
       * Parameters:  None
       * Effects: Adds a time scale to the graph
       */
      renderScale() {
        const { acx, cv, ctx, scale } = this
        const { sampleRate } = acx

        // # pixels for 1 second
        const pps = sampleRate * scale

        let mul = 1
        while (pps * mul > cv.width / 2) mul /= 10

        const len = pps * mul
        const unit = mul >= 1 ? 's' : mul >= 0.001 ? 'ms' : 'µs'
        while (mul < 1) mul *= 1000

        ctx.fillStyle = '#fff'
        ctx.fillRect(cv.width / 2 - len / 2, 0.4 * cv.height, len, 2)
        ctx.fillText(`${mul} ${unit}`, cv.width / 2, 0.38 * cv.height)
      }
    },

    watch: {
      buffers: 'update'
    }
  }
</script>