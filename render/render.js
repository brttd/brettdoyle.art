function render(string, data = global) {
    let parts = string.split(render.commandRE)

    if (parts.length === 1) {
        return string
    }

    //The render property is set, which can mutate the value of the originally passed data object
    //Making a shallow copy stops this happening, as the .render change only happens inside this function
    let shallowDataCopy = {}
    for (let prop in data) {
        shallowDataCopy[prop] = data[prop]
    }
    shallowDataCopy.render = render

    const vm = require('vm')

    vm.createContext(shallowDataCopy)

    let rendered = ''

    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            rendered += parts[i]
        } else {
            try {
                rendered += vm.runInContext(
                    parts[i].substring(2, parts[i].length - 2),
                    shallowDataCopy
                )
            } catch (error) {
                rendered +=
                    '[Error! ' +
                    (error.message || error.toString()) +
                    '. "' +
                    parts[i].substring(2, parts[i].length - 2) +
                    '"]'
            }
        }
    }

    return render(rendered, shallowDataCopy)
}
render.commandRE = new RegExp(/({%[\s\S]*?(?=%})%})/, 'gm')

module.exports = render
