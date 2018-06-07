const fs = require('fs')
const path = require('path')

const marked = require('marked')
const render = require('../render.js')

module.exports = function(file, data, callback) {
    fs.readFile(file.path, 'utf8', (error, content) => {
        if (error) {
            return callback(error)
        }

        callback(null, marked(render(content, data)), {
            name: 'index.html',
            directory: path.join(
                file.directory,
                path.basename(file.name, path.extname(file.name))
            )
        })
    })
}
