const yaml = require('js-yaml')

module.exports = content => {
    return yaml.safeLoad(content)
}
