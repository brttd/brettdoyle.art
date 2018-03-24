const path = require('path')

exports.extensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp']

exports.parse = function(filepath, dir, file) {
    return {
        name: path.basename(file, path.extname(file)),
        dir: dir
    }
}
