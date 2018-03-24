const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')

exports.extensions = ['.yml', '.yaml']

exports.parse = function(filepath, dir, file) {
    try {
        let content = fs.readFileSync(filepath, 'utf8')

        content = yaml.safeLoad(content)

        return content
    } catch (error) {
        return {}
    }
}
