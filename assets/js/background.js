if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime()
    }
}

var canvas = document.getElementById('canvas')
var ctx = canvas.getContext('2d')

var min_light = 92
var max_light = 98

var grey = 'hsl(0, 0%, ' + 96 + '%)'

var w = 0
var h = 0

var retain_on_resize = false
var temp_image_data = false

function updateCanvasSize() {
    if (retain_on_resize) {
        temp_image_data = ctx.getImageData(0, 0, w, h)
    }

    w = canvas.width = window.innerWidth
    h = canvas.height = window.innerHeight

    if (retain_on_resize) {
        ctx.putImageData(temp_image_data, 0, 0)
        temp_image_data = false
    }

    if (typeof onCanvasSizeChange == 'function') {
        onCanvasSizeChange()
    }
}

w = canvas.width = window.innerWidth
h = canvas.height = window.innerHeight

window.addEventListener('resize', updateCanvasSize)

var script = document.createElement('script')
script.src =
    background_scripts[
        Math.round(Math.random() * (background_scripts.length - 1))
    ]

script.onload = function() {
    //only display the background once the script has started running
    canvas.style.opacity = '1'
}

document.body.appendChild(script)
