window.onload = function() {
    var all_videos = document.querySelectorAll('.media.video')

    function onButtonClick() {
        if (this._video_element.paused) {
            this._video_element.play()

            this.textContent = '❚❚'
            this.className = 'active'
        } else {
            this._video_element.pause()

            this.textContent = '►'
            this.className = ''
        }
    }

    function setupVideo(element) {
        var video = element.querySelector('video')

        element.lastChild.appendChild(document.createElement('div'))
        element.lastChild.lastChild.className = 'selectors'

        var playButton = document.createElement('label')
        playButton.textContent = '►'

        element.lastChild.lastChild.appendChild(playButton)

        playButton._video_element = video
        playButton.addEventListener('click', onButtonClick)

        if (video.paused) {
            onButtonClick.call(playButton)
        } else {
            playButton.textContent = '❚❚'
            playButton.className = 'active'
        }
    }

    for (var i = 0; i < all_videos.length; i++) {
        setupVideo(all_videos[i])
    }
}
