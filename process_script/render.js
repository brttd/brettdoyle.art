const vm = require('vm')

//TODO: allow {% %} inside commands...
const commandRe = new RegExp(/({%[\s\S]*?(?=%})%})/, 'gm')

function render(string, data = global, callback) {
    if (typeof string !== 'string') {
        if (typeof callback === 'function') {
            callback(new Error('Render was not given string'))
        }

        return ' [[ !ERROR! Render was not given string ]] '
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        if (typeof callback === 'function') {
            callback(new Error('Render was not given data object'))
        }

        return string + ' [[ !ERROR! Render was not given valid data object ]] '
    }

    let parts = string.split(commandRe)

    if (parts.length > 1) {
        data.render = render
        vm.createContext(data)

        let parsed = ''

        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                parsed += parts[i]
            } else {
                try {
                    parsed += vm.runInContext(
                        parts[i].substring(2, parts[i].length - 2),
                        data
                    )
                } catch (error) {
                    if (typeof callback === 'function') {
                        return callback(error)
                    }

                    parsed +=
                        parts[i] +
                        '[[ !ERROR! ' +
                        (error.message || error.toString()) +
                        ' ]]'
                }
            }
        }

        return parsed
    }

    return string
}

module.exports = render
