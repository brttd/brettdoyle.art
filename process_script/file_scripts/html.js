const path = require('path')
const fs = require('fs')

const render = require('../render')

exports.extensions = ['.html']

exports.parse = function(filepath, dir, file) {
    if (file.startsWith('_')) {
        try {
            let content = fs.readFileSync(filepath, 'utf8')

            return content
        } catch (error) {}
    } else {
        return ''
    }
}

exports.process = function(filepath, dir, file, data) {
    try {
        let content = fs.readFileSync(filepath, 'utf8')

        content = render(content, data)

        let outputDir = path.join(dir, file)
        if (path.basename(file, path.extname(file)).toLowerCase() === 'index') {
            outputDir = dir
        }

        return {
            dir: outputDir,
            file: 'index.html',

            data: content
        }
    } catch (error) {
        return {
            data: error.message || error.toString()
        }
    }
}
