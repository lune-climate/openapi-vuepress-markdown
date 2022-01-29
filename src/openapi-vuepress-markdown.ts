#!/usr/bin/env node

import './handlebarHelpers'
import { Command } from 'commander'
import { generateMarkdownFiles } from './markdownAdapters'
const SwaggerParser = require('swagger-parser')

function validateNumber(arg: string, name: string): boolean {
    if (arg && isNaN(Number(arg))) {
        console.log(`${name} must be a number, instead ${arg}`)
        return false
    }
    return true
}

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
            '-ed, --endpoint-schema-depth <endpoint-schema-depth>',
            'Endpoint schema parse depth. Defaults prefix to 2',
        )
        .option(
            '-rd, --resource-schema-depth <resource-schema-depth>',
            'Resource schema parse depth. Defaults prefix to 2',
        )
        .parse()

    const options = program.opts()
    const { schema, outputDirectory, endpointsPrefix, endpointSchemaDepth, resourceSchemaDepth } =
        options

    if (!validateNumber(endpointSchemaDepth, 'endpoint-schema-depth')) {
        return
    }
    if (!validateNumber(resourceSchemaDepth, 'resourcet-schema-depth')) {
        return
    }

    const parser = new SwaggerParser()
    // let it throw
    const api = await parser.bundle(schema)
    const refs = parser.$refs

    generateMarkdownFiles(
        api,
        refs,
        outputDirectory,
        endpointsPrefix,
        resourceSchemaDepth ? parseInt(resourceSchemaDepth) : undefined,
        endpointSchemaDepth ? parseInt(endpointSchemaDepth) : undefined,
    )
}

// eslint-disable-next-line no-extra-semi
;(async () => {
    await main()
})()
