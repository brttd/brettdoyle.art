const fs = require('fs')
const path = require('path')
const vm = require('vm')

const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const marked = require('marked')
const yaml = require('js-yaml')

const render = require('./render')

const base = path.join(__dirname, '../')

const paths = {
    base: path.join(__dirname, '../'),
    source: path.join(base, 'source/'),
    scripts: path.join(base, 'scripts/'),
    templates: path.join(base, 'templates/'),
    output: path.join(base, 'build/')
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

const parsers = []
const processors = []
const scripts = []

const defaultParser = {
    parse: (filepath, dir, file) => {
        return { _filepath: filepath, _dir: dir, _file: file }
    }
}

const cache = {
    templates: {},
    data: {}
}

//scripts
try {
    let dir = 'file_scripts'
    let scriptList = fs.readdirSync(path.join(__dirname, dir))

    for (let i = 0; i < scriptList.length; i++) {
        if (fs.statSync(path.join(__dirname, dir, scriptList[i])).isFile()) {
            let script = require('./' + dir + '/' + scriptList[i])

            if (Array.isArray(script.extensions)) {
                scripts.push(script)

                if (typeof script.parse === 'function') {
                    parsers.push(script)
                }
                if (typeof script.process === 'function') {
                    processors.push(script)
                }
            }
        }
    }
} catch (error) {
    console.error('ERROR: unable to load file scripts', error)

    return
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

function canParse(file) {
    //getParser will return default parser if none are found, so all files can be parsed
    return true

    let ext = path.extname(file).toLowerCase()

    for (let i = 0; i < parsers.length; i++) {
        if (parsers[i].extensions.includes(ext)) {
            return true
        }
    }

    return false
}
function canProcess(file) {
    let ext = path.extname(file).toLowerCase()

    for (let i = 0; i < processors.length; i++) {
        if (processors[i].extensions.includes(ext)) {
            return true
        }
    }

    return false
}

function getParser(file) {
    let ext = path.extname(file).toLowerCase()

    for (let i = 0; i < parsers.length; i++) {
        if (parsers[i].extensions.includes(ext)) {
            return parsers[i]
        }
    }

    return defaultParser
}
function getProcessor(file) {
    let ext = path.extname(file).toLowerCase()

    for (let i = 0; i < processors.length; i++) {
        if (processors[i].extensions.includes(ext)) {
            return processors[i]
        }
    }
}

function parseFile(file, callback) {
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

    if (!canParse(file)) {
        if (typeof callback === 'function') {
            callback(new Error('Could not find parser for ' + file))
        } else {
            log.warning('Could not find parser for', file)
        }

        return ''
    }

    let parser = getParser(file)

    try {
        let data = parser.parse(
            path.join(paths.source, file),
            path.dirname(file),
            path.basename(file)
        )

        if (typeof callback === 'function') {
            callback(null, data)
        }

        return data
    } catch (error) {
        if (typeof callback === 'function') {
            callback(error)
        } else {
            log.error('Unable to parse file', file, error.message || error)
        }
    }
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

    if (!canProcess(file)) {
        callback(new Error('Could not find processor for ' + file))

        return false
    }

    let processor = getProcessor(file)

    try {
        let filepath = path.join(paths.source, file)

        let dir = path.dirname(file)
        file = path.basename(file)

        log.debug('Processing', path.join(dir, file))

        let processed = processor.process(
            filepath,
            dir,
            file,

            data
        )

        if (processed.hasOwnProperty('data')) {
            if (typeof processed.dir === 'string') {
                dir = processed.dir
            }
            if (typeof processed.file === 'string') {
                file = processed.file
            }

            if (typeof processed.data !== 'string') {
                processed.data = processed.data.toString()
            }

            mkdirp(path.join(paths.output, dir))

            fs.writeFile(
                path.join(paths.output, dir, file),
                processed.data,
                'utf8',
                error => {
                    if (error) {
                        return callback(error)
                    }

                    callback()
                }
            )
        } else {
            callback(
                new Error('Proccessor did not return data property for ' + file)
            )
            return false
        }
    } catch (error) {
        callback(error)
    }
}

function searchDir(dir, callback) {
    if (typeof dir !== 'string') {
        if (typeof callback === 'function') {
            callback(new Error('Given directory path was not a string!'))
        } else {
            log.error('searchDir was not given string directory path!')
        }

        return false
    }

    if (typeof callback !== 'function') {
        log.error('searchDir was not given callback!')

        return false
    }

    fs.readdir(path.join(paths.source, dir), (error, list) => {
        if (error) {
            return callback(error)
        }

        let data = {}

        let toProcess = []

        let processNext = () => {
            if (toProcess.length === 0) {
                return callback(null, data)
            }

            let item = toProcess.pop()

            processFile(path.join(dir, item), data, error => {
                if (error) {
                    return callback(error)
                }

                processNext()
            })
        }

        let searchNext = () => {
            if (list.length === 0) {
                return processNext()
            }

            let item = list.pop()
            let name = path.basename(item, path.extname(item))

            fs.stat(path.join(paths.source, dir, item), (error, stats) => {
                if (error) {
                    return callback(error)
                }

                if (stats.isFile()) {
                    if (canProcess(item)) {
                        toProcess.push(item)
                    }

                    if (canParse(item)) {
                        parseFile(item, (error, fileData) => {
                            if (error) {
                                return callback(error)
                            }

                            if (
                                typeof fileData === 'object' &&
                                !Array.isArray(fileData) &&
                                fileData !== null
                            ) {
                                if (
                                    typeof data[name] !== 'object' ||
                                    Array.isArray(data[name]) ||
                                    data[name] === null
                                ) {
                                    data[name] = {}
                                }

                                copyObjTo(fileData, data[name])
                            } else {
                                data[name] = fileData
                            }

                            searchNext()
                        })
                    }
                } else if (stats.isDirectory()) {
                    searchDir(path.join(dir, item), (error, dirData) => {
                        if (error) {
                            return callback(error)
                        }

                        if (
                            typeof dirData === 'object' &&
                            !Array.isArray(dirData) &&
                            dirData !== null
                        ) {
                            if (
                                typeof data[name] !== 'object' ||
                                Array.isArray(data[name]) ||
                                data[name] === null
                            ) {
                                data[name] = {}
                            }

                            copyObjTo(dirData, data[name])
                        } else {
                            data[name] = dirData
                        }

                        searchNext()
                    })
                }
            })
        }

        searchNext()
    })
}

rimraf(paths.output, error => {
    if (error) {
        return console.error('ERROR:', error.message || error)
    }

    console.log('Processing...')
    searchDir('', error => {
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
