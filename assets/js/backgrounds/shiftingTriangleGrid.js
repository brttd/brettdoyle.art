var spacing = 50
var xVec = [
    spacing / 2,
    Math.sqrt(spacing * spacing - (spacing / 2) * (spacing / 2))
]
var yVec = [xVec[0], -xVec[1]]

var radius = 8

var grid = []

function circle(pos) {
    this.pos = pos
    this.dir = [0, 0]
}

function resetGrid() {
    grid = []

    for (x = -1; xVec[0] * x <= w + spacing; x++) {
        grid.push([])
        var yFlag = true
        for (y = -1; yFlag; y++) {
            var pos = [
                xVec[0] * x + yVec[0] * y - yVec[0] * x,
                xVec[1] * x + yVec[1] * y - yVec[1] * x
            ]
            if (pos[0] <= w / spacing || pos[1] >= yVec[1] * 1.1) {
                grid[x + 1].push(new circle(pos))
            } else {
                yFlag = false
            }
        }
    }
}

function easeQuad(t, d) {
    t /= d / 2

    if (t < 1) return (1 / 2) * t * t
    t--
    return (-1 / 2) * (t * (t - 2) - 1)
}

var lastTime = Date.now()
var time = 0
var offset = [0, 0]

var animLength = 1200

function draw() {
    time = Math.min(animLength, time + Date.now() - lastTime)
    ctx.clearRect(0, 0, w, h)

    var t = time < 0 ? 0 : time / (animLength / 2)
    t = t < 1 ? (1 / 2) * t * t : (-1 / 2) * ((t - 1) * (t - 3) - 1)

    ctx.beginPath()
    for (var x = 0; x < grid.length; x++) {
        for (var y = 0; y < grid[x].length; y++) {
            ctx.moveTo(grid[x][y].pos[0], grid[x][y].pos[1])
            ctx.arc(
                grid[x][y].pos[0] + grid[x][y].dir[0] * t,
                grid[x][y].pos[1] + grid[x][y].dir[1] * t,
                radius,
                0,
                10
            )
        }
    }
    ctx.fill()

    if (time >= animLength) {
        var type = Math.random()

        for (var x = 0; x < grid.length; x++) {
            for (var y = 0; y < grid[x].length; y++) {
                if (type > 0.66) {
                    grid[x][y].dir[0] = y % 2 == 0 ? spacing : -spacing
                    grid[x][y].dir[1] = 0
                } else if (type > 0.33) {
                    grid[x][y].dir[0] = x % 2 == 0 ? yVec[0] : -yVec[0]
                    grid[x][y].dir[1] = x % 2 == 0 ? yVec[1] : -yVec[1]
                } else {
                    grid[x][y].dir[0] = (x + y) % 2 == 0 ? xVec[0] : -xVec[0]
                    grid[x][y].dir[1] = (x + y) % 2 == 0 ? xVec[1] : -xVec[1]
                }
            }
        }

        time = -animLength / 3
    }
    lastTime = Date.now()

    requestAnimationFrame(draw)
}

function onCanvasSizeChange() {
    spacing = Math.max(40, Math.round((w + h) / 50))
    radius = Math.max(8, Math.round(spacing / 6))

    xVec = [
        spacing / 2,
        Math.sqrt(spacing * spacing - (spacing / 2) * (spacing / 2))
    ]
    yVec = [xVec[0], -xVec[1]]

    resetGrid()

    ctx.fillStyle = grey
}

onCanvasSizeChange()

draw()
