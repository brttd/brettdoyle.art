const path = require('path')
const fs = require('fs')

exports.extensions = ['.json']

exports.parse = function(filepath, dir, file) {
    try {
        let content = fs.readFileSync(filepath, 'utf8')

        content = JSON.parse(content)

        return content
    } catch (error) {
        return {}
    }
}
