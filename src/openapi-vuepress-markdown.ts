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
        .option(
            '-e, --endpoints-prefix <endpoints-prefix>',
            'Endpoint file prefix, to avoid filename conflicts with resources. Defaults to blank (no prefix)',
        )
        .option(
            '-E, --endpoints-template <endpoints-template>',
            'Endpoints template file. Defaults to ./endpoints.md',
        )
        .option(
            '-R, --resource-template <resource-template>',
            'Resource template file. Defaults to ./resource.md',
        )
        .parse()

    const options = program.opts()
    const { schema, outputDirectory, endpointsPrefix, endpointsTemplate, resourceTemplate } =
        options

    const parser = new SwaggerParser()
    // let it throw
    const api = await parser.bundle(schema)
    const refs = parser.$refs

    generateMarkdownFiles({
        api,
        refs,
        outputDirectory,
        endpointsPrefix,
        endpointsTemplate,
        resourceTemplate,
    })
}

// eslint-disable-next-line no-extra-semi
;(async () => {
    await main()
})()
