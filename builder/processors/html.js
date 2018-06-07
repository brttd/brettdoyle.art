const fs = require('fs')
const path = require('path')

const render = require('../render.js')

module.exports = function(file, data, callback) {
    fs.readFile(file.path, 'utf8', (error, content) => {
        if (error) {
            return callback(error)
        }

        let output = {
            name: file.name,
            directory: file.directory
        }

        if (file.name.toLowerCase() !== 'index.html') {
            output.directory = path.join(
                file.directory,
                path.basename(file.name, path.extname(file.name))
            )

            file.name = 'index.html'
        }

        callback(null, render(content, data), output)
    })
}
