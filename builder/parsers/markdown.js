const marked = require('marked')

module.exports = content => {
    return marked(content)
}
