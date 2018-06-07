const fs = require('fs')
const path = require('path')

module.exports = function(file, data, callback) {
    fs.readFile(file.path, (error, content) => {
        if (error) {
            return callback(error)
        }

        callback(null, content, {
            directory: path.join('images', file.directory)
        })
    })
}
