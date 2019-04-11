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

var all_images = document.querySelectorAll('.media.images.slider.slider')

function setupImage(element) {
    var sliderElement = document.createElement('div')
    sliderElement.className = 'slider'

    sliderElement.appendChild(document.createElement('div'))
    sliderElement.lastElementChild.className = 'line'
    sliderElement.appendChild(document.createElement('div'))
    sliderElement.lastElementChild.className = 'button'

    element.lastElementChild.lastElementChild.insertBefore(
        sliderElement,
        element.lastElementChild.lastElementChild.firstChild
    )

    var inputs = element.querySelectorAll('input')

    var options = inputs.length
    var activeOption = 0
    var activePosition = 0

    var mouse_down = false
    var updateRequested = false

    var sliderRect = {
        left: 0,
        width: 0
    }

    function updatePosition() {
        updateRequested = false

        sliderElement.lastElementChild.style.left =
            activePosition.toString() + '%'
    }

    function updateSliderSize() {
        sliderRect = sliderElement.getBoundingClientRect()
    }

    function onSliderDrag(event) {
        if (event.offsetX === 0) {
            return false
        }

        var position = Math.max(
            0,
            Math.min(1, (event.pageX - sliderRect.left) / sliderRect.width)
        )

        activeOption = Math.floor(position * options)

        activePosition = position * 100

        inputs[activeOption].checked = true

        if (!updateRequested) {
            updateRequested = true
            requestAnimationFrame(updatePosition)
        }
    }

    function onInputSelect() {
        var old = activeOption
        activeOption = this._index

        activePosition = (100 / options) * activeOption + 50 / options

        sliderElement.lastElementChild.style.transition =
            'left ' + (0.1 * Math.abs(old - activeOption)).toString() + 's'

        if (!updateRequested) {
            updateRequested = true
            requestAnimationFrame(updatePosition)
        }
    }

    requestAnimationFrame(updateSliderSize)
    window.addEventListener('resize', updateSliderSize)
    window.addEventListener('load', updateSliderSize)

    for (var i = 0; i < inputs.length; i++) {
        inputs[i]._index = i
        inputs[i].addEventListener('change', onInputSelect)

        if (inputs[i].checked) {
            onInputSelect.call(inputs[i])
        }
    }

    sliderElement.addEventListener('mousedown', function(event) {
        mouse_down = true

        onSliderDrag(event)

        sliderElement.lastElementChild.style.transition = ''
    })

    sliderElement.addEventListener('mousemove', function(event) {
        if (mouse_down !== false) {
            onSliderDrag(event)
        }
    })

    window.addEventListener('mouseup', function() {
        if (mouse_down) {
            mouse_down = false

            activePosition = (100 / options) * activeOption + 50 / options

            sliderElement.lastElementChild.style.transition = 'left 0.1s'

            if (!updateRequested) {
                updateRequested = true
                requestAnimationFrame(updatePosition)
            }
        }
    })
}

for (var i = 0; i < all_images.length; i++) {
    setupImage(all_images[i])
}
