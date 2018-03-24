const fs = require('fs')
const path = require('path')
const vm = require('vm')

const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const marked = require('marked')
const yaml = require('js-yaml')

const render = require('./render')

const exts = {
    image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
    markdown: ['.md', '.markdown'],
    yaml: ['.yml', '.yaml'],
    json: ['.json']
}

const base = path.join(__dirname, '../')

const paths = {
    base: path.join(__dirname, '../'),
    source: path.join(base, 'source/'),
    scripts: path.join(base, 'scripts/'),
    templates: path.join(base, 'templates/'),
    output: path.join(base, 'build/')
}

const cache = {
    templates: {},
    data: {}
}

const options = {
    debug: true
}

const log = {
    log: [],

    add: (type, messageList) => {
        let message = [...messageList].map(part => part.toString()).join(' ')

        log.log.push('[' + type.toUpperCase() + '] ' + message)
    },

    debug: function() {
        if (options.debug) {
            console.log(...arguments)
        }

        log.add('debug', arguments)
    },
    info: function() {
        log.add('info', arguments)
    },
    warning: function() {
        log.add('warning', arguments)
    },
    error: function() {
        if (options.debug) {
            console.error(...arguments)
        }

        log.add('error', arguments)
    }
}

function copyObjTo(obj, target) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            if (typeof obj[prop] === 'object') {
                if (typeof target[prop] !== 'object') {
                    target[prop] = {}
                }

                copyObjTo(obj[prop], target[prop])
            } else {
                target[prop] = obj[prop]
            }
        }
    }
}

function getFileData(file, callback) {
    if (typeof file !== 'string') {
        if (typeof callback === 'function') {
            callback(new Error('Given file path was not a string!'))
        } else {
            log.error('getFileData was not given string file path!')
        }

        return {}
    }

    if (cache.data.hasOwnProperty(file)) {
        if (typeof callback === 'function') {
            callback(null, cache.data[file])
        }

        return cache.data[file]
    }

    try {
        let ext = path.extname(file).toLowerCase()

        let data = {}

        if (exts.image.includes(ext)) {
            data.name = path.basename(file, path.extname(file))
        } else if (exts.markdown.includes(ext)) {
            if (typeof callback === 'function') {
                return fs.readFile(
                    path.join(paths.source, file),
                    { encoding: 'utf8' },
                    (error, content) => {
                        if (error) {
                            return callback(error)
                        }

                        content = marked(content)
                        content._filepath = file

                        callback(null, content)
                    }
                )
            }

            let content = fs.readFileSync(path.join(paths.source, file), {
                encoding: 'utf8'
            })

            data = marked(content)
        } else if (exts.yaml.includes(ext)) {
            if (typeof callback === 'function') {
                return fs.readFile(
                    path.join(paths.source, file),
                    { encoding: 'utf8' },
                    (error, content) => {
                        if (error) {
                            return callback(error)
                        }

                        content = yaml.safeLoad(content)
                        content._filepath = file

                        callback(null, content)
                    }
                )
            }

            data = yaml.safeLoad(
                fs.readFileSync(path.join(paths.source, file), {
                    encoding: 'utf8'
                })
            )
        } else if (exts.json.includes(ext)) {
            if (typeof callback === 'function') {
                return fs.readFile(
                    path.join(paths.source, file),
                    { encoding: 'utf8' },
                    (error, content) => {
                        if (error) {
                            return callback(error)
                        }

                        content = JSON.parse(content)
                        content._filepath = file

                        callback(null, content)
                    }
                )
            }

            let content = fs.readFileSync(path.join(paths.source, file), {
                encoding: 'utf8'
            })

            data = JSON.parse(content)
        }
        data._filepath = file

        cache.data[file] = data

        if (typeof callback === 'function') {
            callback(null, data)
        }

        return data
    } catch (error) {
        if (typeof callback === 'function') {
            callback(error)
        } else {
            log.error(
                'getFileData was unable to parse file',
                file,
                error.message || error
            )
        }
    }

    return {}
}

function getDirData(dir, callback) {
    if (typeof dir !== 'string') {
        if (typeof callback === 'function') {
            callback(new Error('Given directory path was not a string!'))
        } else {
            log.error('getDirData was not given string directory path!')
        }

        return {}
    }

    if (typeof callback === 'function') {
        fs.readdir(path.join(paths.source, dir), (error, list) => {
            if (error) {
                return callback(error)
            }

            let data = {}

            let getNext = () => {
                if (list.length === 0) {
                    return callback(null, data)
                }

                let item = list.pop()
                let name = path.basename(item, path.extname(item))

                fs.stat(path.join(paths.source, dir, item), (error, stats) => {
                    if (error) {
                        return callback(error)
                    }

                    if (typeof data[name] !== 'object') {
                        data[name] = {}
                    }

                    if (stats.isFile()) {
                        getFileData(path.join(dir, item), (error, fileData) => {
                            if (error) {
                                return callback(error)
                            }

                            copyObjTo(fileData, data[name])

                            getNext()
                        })
                    } else {
                        getDirData(path.join(dir, item), (error, dirData) => {
                            if (error) {
                                return callback(error)
                            }

                            copyObjTo(dirData, data[name])

                            data[name] = dirData

                            getNext()
                        })
                    }
                })
            }

            getNext()
        })
    } else {
        try {
            let list = fs.readdirSync(path.join(paths.source, dir))

            let data = {}

            for (let i = 0; i < list.length; i++) {
                let stats = fs.statSync(path.join(paths.source, dir, list[i]))

                if (typeof data[list[i]] !== 'object') {
                    data[list[i]] = {}
                }

                if (stats.isFile()) {
                    copyObjTo(
                        getFileData(path.join(dir, list[i])),
                        data[list[i]]
                    )
                } else {
                    copyObjTo(
                        getDirData(path.join(dir, list[i])),
                        data[list[i]]
                    )
                }
            }

            return data
        } catch (error) {
            log.error(
                'getDirData was unable to parse directory',
                dir,
                error.message || error
            )
        }
    }

    return {}
}

function processFile(file, data, callback) {
    if (typeof file !== 'string') {
        if (typeof callback === 'function') {
            callback(new Error('Given file path was not string!'))
        } else {
            log.error('processFile was not given string file path!')
        }

        return false
    }

    if (typeof data !== 'object') {
        if (typeof callback === 'function') {
            callback(new Error('Given data was not object!'))
        } else {
            log.error('processFile was not given object data!')
        }

        return false
    }

    if (typeof callback !== 'function') {
        return log.error('processFile was not given callback function!')
    }

    let ext = path.extname(file).toLowerCase()

    if (ext === '.html') {
        log.info('Processing', file)

        fs.readFile(
            path.join(paths.source, file),
            {
                encoding: 'utf8'
            },
            (error, content) => {
                if (error) {
                    return callback(error)
                }

                try {
                    content = render(content, data)

                    let outputDir = path.join(
                        path.dirname(file),
                        path.basename(file, path.extname(file))
                    )

                    if (path.basename(file, path.extname(file)) === 'index') {
                        outputDir = path.dirname(file)
                    }

                    mkdirp(path.join(paths.output, outputDir))

                    fs.writeFile(
                        path.join(paths.output, outputDir, 'index.html'),
                        content,
                        error => {
                            if (error) {
                                return callback(error)
                            }

                            callback()
                        }
                    )
                } catch (error) {
                    callback(error)
                }
            }
        )
    } else {
        return callback(null)
    }
}

function processDir(dir, callback) {
    if (typeof dir !== 'string') {
        if (typeof callback === 'function') {
            callback(new Error('Given dir was not a string!'))
        } else {
            log.error('processDir was not given string directory path!')
        }

        return false
    }

    if (typeof callback !== 'function') {
        return log.error('processDir was not given callback function!')
    }

    getDirData(dir, (error, data) => {
        if (error) {
            return callback(error)
        }

        fs.readdir(path.join(paths.source, dir), (error, list) => {
            if (error) {
                return callback(error)
            }

            let processNext = () => {
                if (list.length === 0) {
                    return callback(null)
                }

                let item = list.pop()

                fs.stat(path.join(paths.source, dir, item), (error, stats) => {
                    if (error) {
                        return callback(error)
                    }

                    if (stats.isFile()) {
                        processFile(path.join(dir, item), data, error => {
                            if (error) {
                                return callback(error)
                            }

                            processNext()
                        })
                    } else {
                        processDir(path.join(dir, item), error => {
                            if (error) {
                                return callback(error)
                            }

                            processNext()
                        })
                    }
                })
            }

            processNext()
        })
    })
}

console.log('Processing...')
rimraf(paths.output, error => {
    if (error) {
        return console.error('ERROR:', error.message || error)
    }

    processDir('', error => {
        if (error) {
            return console.error('ERROR: ', error.message || error)
        }

        if (log.log.length > 0) {
            mkdirp(paths.output)

            let fullLog = log.log.join('\n')
            fs.writeFileSync(path.join(paths.output, 'build.log'), fullLog)
        }

        console.log('Finished!')

        if (log.log.length > 0) {
            console.log('See', path.join(paths.output, 'build.log'), 'for logs')
        }
    })
})
