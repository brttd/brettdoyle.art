const fs = require('fs-extra')
const async = require('async')
const path = require('path')

const marked = require('marked')
const yaml = require('js-yaml')
const imageSize = require('image-size')

const render = require('render')

let defaultOptions = {
    source: 'source',
    output: 'build'
}

let _tree = {
    fileContentCache: {},
    baseDirectory: process.cwd(),

    fileParsers: [
        {
            extensions: ['.json'],
            parse: file => {
                return JSON.parse(fs.readFileSync(file.sourcePath, 'utf8'))
            }
        },
        {
            extensions: ['.html', '.js', '.txt'],
            parse: file => {
                return fs.readFileSync(file.sourcePath, 'utf8')
            }
        },
        {
            extensions: ['.yaml', '.yml'],
            parse: file => {
                return yaml.safeLoad(fs.readFileSync(file.sourcePath, 'utf8'))
            }
        },
        {
            extensions: ['.md', '.markdown'],
            parse: file => {
                return marked(fs.readFileSync(file.sourcePath, 'utf8'))
            }
        },
        {
            extensions: [
                '.bmp',
                '.gif',
                '.icns',
                '.ico',
                '.jpeg',
                '.jpg',
                '.png',
                '.tiff',
                '.webp',
                '.svg'
            ],
            parse: file => {
                return imageSize(file.sourcePath)
            }
        }
    ],
    fileProcessors: [
        {
            extensions: ['.html', '.md', '.markdown', '.js', '.txt'],
            process: (file, data) => {
                return {
                    content: render(file.content, data)
                }
            }
        },
        {
            extensions: [
                '.bmp',
                '.gif',
                '.icns',
                '.ico',
                '.jpeg',
                '.jpg',
                '.png',
                '.tiff',
                '.webp',
                '.svg'
            ],
            process: file => {
                return [
                    {
                        directory: file.directory,
                        filename: file.filename
                    },
                    {
                        directory: path.join('images', file.directory),
                        filename: file.filename
                    }
                ]
            }
        }
    ],

    getItemDirectory: function() {
        if (this.folder) {
            return path.join(this.folder.directory, this.folder.name)
        }

        return ''
    },

    fileProperties: {
        filename: {
            get: function() {
                return this._filename
            },
            set: function(filename) {
                this._filename = filename
            }
        },
        content: {
            get: function(file) {
                if (_tree.fileContentCache[file.sourcePath]) {
                    return _tree.fileContentCache[file.sourcePath]
                }

                let ext = path.extname(file.sourcePath).toLowerCase()

                for (let i = 0; i < _tree.fileParsers.length; i++) {
                    if (_tree.fileParsers[i].extensions.includes(ext)) {
                        try {
                            return _tree.fileParsers[i].parse(file)
                        } catch (error) {
                            //TODO
                        }
                    }
                }

                return {}
            },
            set: function(file, content) {
                _tree.fileContentCache[file.sourcePath] = content
            }
        },
        output: {
            get: function(file) {
                let data
                if (file.folder) {
                    data = file.folder.data
                }

                let ext = path.extname(file.sourcePath).toLowerCase()

                for (let i = 0; i < _tree.fileProcessors.length; i++) {
                    if (_tree.fileProcessors[i].extensions.includes(ext)) {
                        try {
                            return _tree.fileProcessors[i].process(file, data)
                        } catch (error) {
                            //TODO
                        }
                    }
                }

                return {}
            }
        }
    },

    getFile: function(directory, file, properties) {
        let fileObject = {
            _filename: file,
            _originalFilename: file,
            _originalFilePath: path.join(directory, file),

            build: true
        }

        Object.defineProperty(fileObject, 'sourcePath', {
            value: path.join(_tree.baseDirectory, directory, file),

            enumerable: true,
            configurable: false,
            writable: false
        })

        Object.defineProperty(fileObject, 'directory', {
            get: _tree.getItemDirectory.bind(fileObject),

            enumerable: true
        })

        Object.defineProperty(fileObject, 'filename', {
            get: _tree.fileProperties.filename.get.bind(fileObject),
            set: _tree.fileProperties.filename.set.bind(fileObject),

            enumerable: true
        })

        Object.defineProperty(fileObject, 'content', {
            get: _tree.fileProperties.content.get.bind(_tree, fileObject),
            set: _tree.fileProperties.content.set.bind(_tree, fileObject),

            enumerable: true
        })

        Object.defineProperty(fileObject, 'output', {
            get: _tree.fileProperties.output.get.bind(_tree, fileObject),

            enumerable: true
        })

        if (
            typeof properties === 'object' &&
            properties !== null &&
            !Array.isArray(properties)
        ) {
            if (typeof properties.content !== 'undefined') {
                fileObject.content = properties.content
            }
            if (typeof properties.build === 'boolean') {
                fileObject.build = properties.build
            }
        }

        return fileObject
    },

    folderProperties: {
        name: {
            get: function() {
                return this._name
            },
            set: function(name) {
                this._name = name
            }
        },
        data: {
            get: function() {
                let obj = {}

                for (let i = 0; i < this.folders.length; i++) {
                    obj[this.folders[i].name] = this.folders[i].data
                }

                for (let i = 0; i < this.files.length; i++) {
                    let name = this.files[i].filename
                    name = path.basename(name, path.extname(name))

                    obj[name] = this.files[i].content
                }

                return obj
            }
        },

        add: function(directory, filename, content) {
            let file = _tree.getFile(directory, filename, content)

            file.folder = this

            this.files.push(file)
        },

        addFolder: function(newDir) {
            if (typeof newDir !== 'object') {
                newDir = _tree.getFolder(newDir)
            }

            newDir.folder = this

            this.folders.push(newDir)
        }
    },

    getFolder: function(directory) {
        let folderObject = {
            _name: path.basename(directory),
            _originalName: path.basename(directory),
            _originalPath: directory,

            folders: [],
            files: []
        }

        Object.defineProperty(folderObject, 'data', {
            get: _tree.folderProperties.data.get.bind(folderObject),

            enumerable: true
        })

        Object.defineProperty(folderObject, 'directory', {
            get: _tree.getItemDirectory.bind(folderObject),

            enumerable: true
        })

        Object.defineProperty(folderObject, 'name', {
            get: _tree.folderProperties.name.get.bind(folderObject),
            set: _tree.folderProperties.name.set.bind(folderObject),

            enumerable: true
        })

        folderObject.add = _tree.folderProperties.add.bind(
            folderObject,
            directory
        )

        folderObject.addFolder = _tree.folderProperties.addFolder.bind(
            folderObject
        )

        return folderObject
    }
}

function checkOptions(options) {
    if (
        Array.isArray(options) ||
        options === null ||
        typeof options !== 'object'
    ) {
        options = {}
    }

    if (typeof options.source !== 'string') {
        options.source = defaultOptions.source
    }
    if (typeof options.output !== 'string') {
        options.output = defaultOptions.output
    }

    return options
}

function buildDirectoryTree(baseDirectory, directory, callback) {
    fs.readdir(path.join(baseDirectory, directory), (error, list) => {
        if (error) {
            return callback(error)
        }

        let tree = _tree.getFolder(directory)

        function addToTree(item, callback) {
            fs.stat(
                path.join(baseDirectory, directory, item),
                (error, stats) => {
                    if (error) {
                        return callback(error)
                    }

                    if (stats.isDirectory()) {
                        buildDirectoryTree(
                            baseDirectory,
                            path.join(directory, item),
                            (error, subDirTree) => {
                                if (error) {
                                    return callback(error)
                                }

                                tree.addFolder(subDirTree)

                                callback()
                            }
                        )
                    } else {
                        tree.add(item)

                        callback()
                    }
                }
            )
        }

        async.each(list, addToTree, error => {
            if (error) {
                return callback(error)
            }

            callback(null, tree)
        })
    })
}

function saveDirectoryTree(baseDirectory, tree, callback) {
    fs.mkdirs(path.join(baseDirectory, tree.directory, tree.name), error => {
        if (error) {
            return callback(error)
        }

        function writeSubTree(subTree, callback) {
            saveDirectoryTree(baseDirectory, subTree, callback)
        }

        function saveFileOutput(file, output, callback) {
            let fullDirectory = path.join(
                baseDirectory,
                typeof output.directory === 'string'
                    ? output.directory
                    : file.directory
            )
            let filename =
                typeof output.filename === 'string'
                    ? output.filename
                    : file.filename

            fs.mkdirs(fullDirectory, error => {
                if (error) {
                    return callback(error)
                }

                if (output.content) {
                    fs.writeFile(
                        path.join(fullDirectory, filename),
                        output.content,
                        error => {
                            if (error) {
                                return callback(error)
                            }

                            callback()
                        }
                    )
                } else {
                    fs.copyFile(
                        file.sourcePath,
                        path.join(fullDirectory, filename),
                        error => {
                            if (error) {
                                return callback(error)
                            }

                            callback()
                        }
                    )
                }
            })
        }

        function writeFile(file, callback) {
            if (!file.build) {
                return false
            }

            let output = file.output

            if (Array.isArray(output)) {
                async.each(output, async.apply(saveFileOutput, file), callback)
            } else if (typeof output === 'object' && output !== null) {
                saveFileOutput(file, output, callback)
            } else {
                callback()
            }
        }

        async.each(tree.folders, writeSubTree, error => {
            if (error) {
                return callback(error)
            }

            async.each(tree.files, writeFile, error => {
                if (error) {
                    return callback(error)
                }

                callback()
            })
        })
    })
}

module.exports = function build(directory = process.cwd(), options = {}) {
    if (!path.isAbsolute(directory)) {
        directory = process.cwd()
    }

    options = checkOptions(options)

    _tree.baseDirectory = options.source

    buildDirectoryTree(options.source, '', (error, tree) => {
        if (error) {
            return console.error(error)
        }

        fs.emptyDir(path.join(directory, options.output), error => {
            if (error) {
                return console.error(error)
            }

            saveDirectoryTree(
                path.join(directory, options.output),
                tree,
                error => {
                    if (error) {
                        return console.error(error)
                    }
                }
            )
        })
    })
}
