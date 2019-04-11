;(function() {
    var vendors = ['ms', 'moz', 'webkit', 'o']

    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame =
            window[vendors[x] + 'RequestAnimationFrame']
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback) {
            window.setTimeout(callback, 100)
        }
})()

var all_videos = document.querySelectorAll('.media.video')

function setupVideo(element) {
    var video = element.querySelector('video')

    element.lastElementChild.appendChild(document.createElement('div'))
    element.lastElementChild.lastElementChild.className = 'selectors'

    var playButton = document.createElement('label')
    playButton.appendChild(document.createElement('span'))
    playButton.lastElementChild.textContent = '►'

    element.lastElementChild.lastElementChild.appendChild(playButton)

    playButton._video_element = video
    playButton.addEventListener('click', onButtonClick)

    var timeline = document.createElement('div')
    timeline.className = 'slider'

    timeline.appendChild(document.createElement('div'))
    timeline.lastElementChild.className = 'button'
    timeline.appendChild(document.createElement('div'))
    timeline.lastElementChild.className = 'line'

    timeline._video_element = video

    element.lastElementChild.lastElementChild.appendChild(timeline)

    var playing = false
    var seeking_paused = false

    var updateRequested = false
    var mouse_down = false

    var sliderRect = {
        left: 0,
        width: 0
    }

    function onButtonClick() {
        playing = !playing

        if (playing) {
            video.play()

            playButton.lastElementChild.textContent = '❚❚'
            playButton.className = 'active'

            timeline.className = 'slider active'
        } else {
            video.pause()

            playButton.lastElementChild.textContent = '►'
            playButton.className = ''

            timeline.className = 'slider'
        }
    }

    function onVideoUpdate() {
        timeline.firstElementChild.style.left =
            ((video.currentTime / video.duration) * 100).toString() + '%'

        if (!video.paused) {
            requestAnimationFrame(onVideoUpdate)
        } else {
            updateRequested = false
        }
    }

    function updateSliderSize() {
        sliderRect = timeline.getBoundingClientRect()
    }

    function onTimelineDrag(event) {
        var position = (event.pageX - sliderRect.left) / sliderRect.width

        video.currentTime = position * video.duration

        if (!updateRequested) {
            updateRequested = true
            requestAnimationFrame(onVideoUpdate)
        }
    }

    requestAnimationFrame(updateSliderSize)
    window.addEventListener('resize', updateSliderSize)
    window.addEventListener('load', updateSliderSize)

    if (video.paused) {
        onButtonClick()
    } else {
        playing = true

        playButton.lastElementChild.textContent = '❚❚'
        playButton.className = 'active'

        timeline.classList = 'slider active'

        updateRequested = true
        requestAnimationFrame(onVideoUpdate)
    }

    video.addEventListener('play', function() {
        if (!updateRequested) {
            updateRequested = true
            requestAnimationFrame(onVideoUpdate)
        }
    })

    timeline.addEventListener('mousedown', function(event) {
        mouse_down = true

        if (!video.paused) {
            video.pause()
        }

        seeking_paused = true

        onTimelineDrag(event)
    })

    timeline.addEventListener('mousemove', function(event) {
        if (mouse_down !== false) {
            onTimelineDrag(event)
        }
    })

    window.addEventListener('mouseup', function() {
        if (mouse_down) {
            mouse_down = false

            if (seeking_paused && playing) {
                video.play()

                seeking_paused = false
            }
        }
    })
}

for (var i = 0; i < all_videos.length; i++) {
    setupVideo(all_videos[i])
}
