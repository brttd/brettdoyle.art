var gridSize, gridPadding, draw_size, cx, cy

var rad = 0

var grid = []

var minBrightness = 240

function resetGrid() {
    grid = []
    for (x = 0; x < w / gridSize; x++) {
        grid.push([])
        for (y = 0; y < h / gridSize; y++) {
            grid[x].push(Math.random())
        }
    }
}

resetGrid()

function onCanvasSizeChange() {
    gridSize = w / (w / (Math.min(w, h) / 40))
    draw_size = ~~gridSize
    gridPadding = gridSize * 2

    cx = w / 2
    cy = h / 2

    ctx.globalAlpha = 0.1

    resetGrid()
}

let time = 0
function draw() {
    var time = Date.now()
    for (var x = gridPadding / 2; x < w; x += gridSize + gridPadding) {
        for (var y = gridPadding / 2; y < h; y += gridSize + gridPadding) {
            var res =
                Math.cos(x / 3 / Math.sin(y / 2) + time * 0.002) *
                (max_light - min_light)

            ctx.fillStyle =
                'hsl(0,0%,' + Math.min(min_light + res, max_light) + '%)'
            ctx.fillRect(~~x, ~~y, draw_size, draw_size)
        }
    }
    rad += gridSize / 3

    if (rad > (window.innerWidth + window.innerHeight) / 2) {
        rad = 0
    }

    requestAnimationFrame(draw)
}

onCanvasSizeChange()

requestAnimationFrame(draw)
