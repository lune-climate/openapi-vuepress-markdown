#!/usr/bin/env node

import './handlebarHelpers'
import { Command } from 'commander'
import { generateMarkdownFiles } from './markdownAdapters'
const SwaggerParser = require('swagger-parser')

async function main(): Promise<void> {
    const program = new Command()
    program
        .requiredOption('-s, --schema <schema>', 'OpenAPI spec in json or yml format')
        .option(
            '-o, --output-directory <output-directory>',
            'Output destination directory. If not specified, then the output is redirected to standard output',
        )
        .parse()
        .parse()

    const options = program.opts()
    const { schema, outputDirectory } = options

    const parser = new SwaggerParser()
    // let it throw
    const api = await parser.bundle(schema)
    const refs = parser.$refs

    generateMarkdownFiles(api, refs, outputDirectory)
}

// eslint-disable-next-line no-extra-semi
;(async () => {
    await main()
})()
