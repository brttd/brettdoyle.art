const path = require('path')
const fs = require('fs')
const marked = require('marked')

exports.extensions = ['.md', '.markdown']

exports.parse = function(filepath, dir, file) {
    try {
        let content = fs.readFileSync(filepath, 'utf8')

        content = marked(content)

        return content
    } catch (error) {
        return error.message || error.toString()
    }
}
