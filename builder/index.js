const fs = require('fs')
const path = require('path')

const async = require('async')
const minimatch = require('minimatch')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const yaml = require('js-yaml')

const defaultPaths = {
    source: '/source/',
    scripts: '/scripts/',
    templates: '/templates/',
    output: '/build/'
}

const defaults = {
    debug: false,

    parsers: [
        {
            extensions: ['.json'],

            parse: require('./parsers/json.js')
        },
        {
            extensions: ['.yml', '.yaml'],
            parse: require('./parsers/yaml.js')
        },
        {
            extensions: ['.html'],
            parse: require('./parsers/html.js')
        },
        {
            extensions: ['.markdown', '.md'],

            parse: require('./parsers/markdown.js')
        }
    ],
    processors: [
        {
            extensions: ['.html'],

            process: require('./processors/html.js')
        },
        {
            extensions: [
                '.png',
                '.jpeg',
                '.jpg',
                '.webp',
                '.gif',
                '.svg',
                '.tif'
            ],
            process: require('./processors/image.js')
        }
    ]
}

//Basic utility functions
function isObject(obj) {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj)
}

function copyObjTo(obj, target) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            if (isObject(obj[prop])) {
                if (!isObject(target[prop])) {
                    target[prop] = {}
                }

                copyObjTo(obj[prop], target[prop])
            } else {
                target[prop] = obj[prop]
            }
        }
    }
}

//Basic file operations
function canProcess(filePath, options) {
    let ext = path.extname(filePath).toLowerCase()

    for (let i = 0; i < options.processors.length; i++) {
        if (options.processors[i].extensions.includes(ext)) {
            return true
        }
    }

    return false
}
function canParse(filePath, options) {
    let ext = path.extname(filePath).toLowerCase()

    for (let i = 0; i < options.parsers.length; i++) {
        if (options.parsers[i].extensions.includes(ext)) {
            return true
        }
    }

    return false
}

function processFile(directory, paths, options, localData, file, callback) {
    if (options.debug) {
        console.info('Processing', directory, file)
    }

    let ext = path.extname(file).toLowerCase()

    let processor = options.processors.find(processor => {
        return processor.extensions.includes(ext)
    })

    if (!processor) {
        if (options.debug) {
            console.info('No processor')
        }
        return false
    }

    let hasSaved = false
    function saveContent(content, options) {
        if (hasSaved) {
            return false
        }

        hasSaved = true

        let dir = directory
        let name = file

        if (typeof options.directory === 'string') {
            dir = path.normalize(options.directory)
        }
        if (typeof options.name === 'string') {
            name = options.name
        }

        if (options.debug) {
            console.info('Saving file at', path.join(dir, name))
        }

        mkdirp(path.join(paths.output, dir), error => {
            if (error) {
                return callback(error)
            }

            fs.writeFile(
                path.join(paths.output, dir, name),
                content,
                'utf8',
                callback
            )
        })
    }

    try {
        processor.process(
            {
                path: path.join(paths.source, directory, file),
                directory: directory,
                name: file
            },
            localData,
            (error, content, options) => {
                if (error) {
                    return callback(error)
                }

                saveContent(content, options || {})
            }
        )
    } catch (error) {
        return callback(error)
    }
}

function parseFile(directory, paths, options, file, callback) {
    if (options.debug) {
        console.info('Parsing', directory, file)
    }

    let ext = path.extname(file).toLowerCase()

    let parser = options.parsers.find(parser => {
        return parser.extensions.includes(ext)
    })

    if (!parser) {
        if (options.debug) {
            console.info('No parser found')
        }

        return callback(null)
    }

    fs.readFile(
        path.join(paths.source, directory, file),
        'utf8',
        (error, content) => {
            if (error) {
                return callback(error)
            }

            try {
                let data = parser.parse(content, {
                    path: path.join(paths.source, directory, file),
                    directory: directory,
                    name: file
                })

                callback(null, data)
            } catch (error) {
                callback(error)
            }
        }
    )
}

function processDir(directory, paths, options, callback) {
    fs.readdir(path.join(paths.source, directory), (error, list) => {
        if (error) {
            return callback(error)
        }

        if (options.debug) {
            console.info('')
            console.info(
                'Checking',
                list.length,
                'items in "' + directory + '"'
            )
        }

        let filesToProcess = []
        let localData = {
            _files: []
        }

        function checkItem(item, callback) {
            let fullPath = path.join(paths.source, directory, item)
            let name = path.basename(item, path.extname(item))

            fs.stat(fullPath, (error, stats) => {
                if (error) {
                    return callback(error)
                }

                if (stats.isFile()) {
                    if (Array.isArray(localData._files)) {
                        localData._files.push(item)
                    }
                    if (canProcess(path.join(directory, item), options)) {
                        filesToProcess.push(item)
                    }

                    parseFile(
                        directory,
                        paths,
                        options,
                        item,
                        (error, fileData) => {
                            if (error) {
                                return callback(error)
                            }

                            if (isObject(fileData)) {
                                if (!isObject(localData[name])) {
                                    localData[name] = {}
                                }

                                copyObjTo(fileData, localData[name])
                            } else if (typeof fileData !== 'undefined') {
                                localData[name] = fileData
                            }

                            callback()
                        }
                    )
                } else if (stats.isDirectory()) {
                    processDir(
                        path.join(directory, item),
                        paths,
                        options,
                        (error, subdirectoryData) => {
                            if (error) {
                                return callback(error)
                            }

                            if (!isObject(localData[name])) {
                                localData[name] = {}
                            }

                            copyObjTo(subdirectoryData, localData[name])

                            callback()
                        }
                    )
                } else {
                    callback()
                }
            })
        }

        async.each(list, checkItem, error => {
            if (error) {
                return callback(error)
            }

            async.each(
                filesToProcess,
                async.apply(processFile, directory, paths, options, localData),
                error => {
                    if (error) {
                        return callback(error)
                    }

                    callback(null, localData)
                }
            )
        })
    })
}

function process(directory, options, callback) {
    if (!path.isAbsolute(directory)) {
        throw new Error('Path was not absolute!', directory)
    }
    if (
        typeof options !== 'object' ||
        options === null ||
        Array.isArray(options)
    ) {
        options = {}
    }

    for (let prop in defaults) {
        if (!options.hasOwnProperty(prop)) {
            options[prop] = defaults[prop]
        }
    }

    options.parsers = defaults.parsers
    options.processors = defaults.processors

    let paths = {
        base: path.normalize(directory),
        source: path.join(
            directory,
            typeof options.source === 'string'
                ? options.source
                : defaultPaths.source
        ),
        scripts: path.join(
            directory,
            typeof options.scripts === 'string'
                ? options.scripts
                : defaultPaths.scripts
        ),
        templates: path.join(
            directory,
            typeof options.templates === 'string'
                ? options.templates
                : defaultPaths.templates
        ),
        output: path.join(
            directory,
            typeof options.output === 'string'
                ? options.output
                : defaultPaths.output
        )
    }

    rimraf(paths.output, error => {
        if (error) {
            if (typeof callback === 'function') {
                callback(error)
            }
            return false
        }

        processDir('', paths, options, error => {
            if (error) {
                if (typeof callback === 'function') {
                    callback(error)
                }
                return false
            }

            if (typeof callback === 'function') {
                callback()
            }
        })
    })
}

module.exports = process
module.exports.render = require('./render.js')
