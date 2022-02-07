import * as Handlebars from 'handlebars'
import {
    Endpoint,
    IRefs,
    MarkdownTemplateData,
    Properties,
    Resource,
    ResponseSchema,
} from './types'
import { find, flatten, groupBy, isNil, omit, sortBy } from 'ramda'
import { readFileSync, writeFileSync } from 'fs'
import { OpenAPIV3 } from 'openapi-types'

const deepcopy = require('deepcopy')
const path = require('path')

const CONTENT_TYPE = 'application/json'

const METHODS = [
    OpenAPIV3.HttpMethods.GET,
    OpenAPIV3.HttpMethods.PUT,
    OpenAPIV3.HttpMethods.PATCH,
    OpenAPIV3.HttpMethods.DELETE,
    OpenAPIV3.HttpMethods.POST,
]

function mergeSchemaObjects(...schemaObjects: OpenAPIV3.SchemaObject[]): OpenAPIV3.SchemaObject {
    // mergeSchemaObjects merges objects. No resolution is performed: eg allOf or refs -> Just merge
    return schemaObjects.reduce(
        (currSchemaObject, schemaObject: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject => {
            return {
                ...currSchemaObject,
                ...schemaObject,
                properties: {
                    ...(currSchemaObject.properties ?? {}),
                    ...(schemaObject.properties ?? {}),
                },
                required: [...(currSchemaObject.required ?? []), ...(schemaObject.required ?? [])],
            }
        },
        { properties: {}, required: [] } as OpenAPIV3.SchemaObject,
    )
}

function resolveAllOf(
    schemaObject: OpenAPIV3.SchemaObject,
    refs: IRefs,
    depth: number | undefined = undefined,
    depthCounter: number = 0,
): OpenAPIV3.SchemaObject {
    if (!schemaObject.allOf) {
        return schemaObject
    }
    return mergeSchemaObjects(
        omit(['allOf'], schemaObject) as OpenAPIV3.SchemaObject,
        ...(schemaObject.allOf as OpenAPIV3.SchemaObject[]).map(
            (childSchemaObject: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject => {
                return resolveSchemaOrReferenceObject(
                    childSchemaObject,
                    refs,
                    depth,
                    depthCounter + 1,
                )
            },
        ),
    )
}

function resolveOneOf(
    schemaObject: OpenAPIV3.SchemaObject,
    refs: IRefs,
    depth: number | undefined = undefined,
    depthCounter: number = 0,
): OpenAPIV3.SchemaObject {
    if (!schemaObject.oneOf) {
        return schemaObject
    }

    return {
        ...schemaObject,
        oneOf: schemaObject.oneOf.map(
            (
                childSchemaObject: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
            ): OpenAPIV3.SchemaObject =>
                resolveSchemaOrReferenceObject(childSchemaObject, refs, depth, depthCounter),
        ),
    }
}

function resolveExampleAllOf(
    schemaObject: OpenAPIV3.SchemaObject,
    refs: IRefs,
): Record<string, any> | undefined {
    if (!schemaObject.allOf) {
        return undefined
    }
    return Object.fromEntries(
        (schemaObject.allOf as OpenAPIV3.SchemaObject[]).map(
            (childSchemaObject: OpenAPIV3.SchemaObject) => {
                const resolvedChildSchemaObject = resolveSchemaOrReferenceObject(
                    childSchemaObject,
                    refs,
                )
                return Object.entries(buildExampleTree(resolvedChildSchemaObject, refs)!)
            },
        ),
    )
}

function resolveExampleOneOf(
    schemaObject: OpenAPIV3.SchemaObject,
    refs: IRefs,
): Record<string, any> | undefined {
    if (!schemaObject.oneOf) {
        return undefined
    }

    // for now, for simplicity, pick the first
    let childSchemaObject = schemaObject.oneOf[0]

    childSchemaObject = resolveSchemaOrReferenceObject(childSchemaObject, refs)
    return buildExampleTree(childSchemaObject, refs)
}

function resolveProperties(
    properties: Properties | undefined,
    refs: IRefs,
    depth: number | undefined = undefined,
    depthCounter: number = 0,
): Properties | undefined {
    if (!properties) {
        return properties
    }
    return Object.keys(properties).reduce((prevProperties: Properties, key: string): Properties => {
        const childSchemaObject: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject =
            properties[key]
        prevProperties[key] = resolveSchemaOrReferenceObject(
            childSchemaObject,
            refs,
            depth,
            depthCounter + 1,
        )
        return prevProperties
    }, properties ?? {})
}

function resolveExampleProperties(
    properties: Properties | undefined,
    refs: IRefs,
): Record<string, any> {
    if (!properties) {
        return {}
    }
    return Object.keys(properties).reduce((obj, key: string) => {
        const childSchemaObject = properties[key]
        const resolvedChildSchemaObject = resolveSchemaOrReferenceObject(childSchemaObject, refs)
        obj[key] = buildExampleTree(resolvedChildSchemaObject, refs)
        return obj
    }, {} as Record<string, any>)
}

function resolveExampleAdditionalProperties(
    additionalProperties: boolean | OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
): Record<string, any> {
    if (!additionalProperties) {
        return {}
    }

    // this is not a correct translation, but let's go with it for now
    return {
        property1: 'string',
        property2: 'number',
    }
}

function resolveRef(
    schemaOrRefObject: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    refs: IRefs,
): OpenAPIV3.SchemaObject & { ref?: string } {
    const refObject = schemaOrRefObject as OpenAPIV3.ReferenceObject
    if (!refObject.$ref) {
        return deepcopy(schemaOrRefObject as OpenAPIV3.SchemaObject) // make a deepcopy for safety
    }
    const schemaObject = refs.get(refObject.$ref) as OpenAPIV3.SchemaObject

    // keep reference in `ref` property if it has been resolved
    return deepcopy({ ...schemaObject, ref: refObject.$ref }) // make a deep copy for safety
}

function resolveSchemaOrReferenceObject(
    schemaObject: Readonly<OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
    refs: IRefs,
    depth: number | undefined = undefined,
    depthCounter: number = 0,
): OpenAPIV3.SchemaObject {
    // Sometimes there is no need to resolve the whole tree.
    // A reference table has only one dimension, however an example should describe the entire object
    if (depth && depthCounter === depth) {
        return deepcopy(schemaObject as OpenAPIV3.SchemaObject)
    }

    // Resolve ref
    let resolvedSchemaObject = resolveRef(schemaObject, refs)

    // Resolve allOf
    if (resolvedSchemaObject.allOf) {
        return resolveAllOf(resolvedSchemaObject, refs, depth, depthCounter)
    }

    // Resolve oneOf
    if (resolvedSchemaObject.oneOf) {
        return resolveOneOf(resolvedSchemaObject, refs, depth, depthCounter)
    }

    // NOTE: oneOf, anyOf is currently not supported

    // Resolve object
    if (resolvedSchemaObject.type === 'object') {
        resolvedSchemaObject = {
            ...resolvedSchemaObject,
            properties: resolveProperties(
                resolvedSchemaObject.properties,
                refs,
                depth,
                depthCounter,
            ),
        }
    }

    // Resolve array item
    if (resolvedSchemaObject.type === 'array') {
        resolvedSchemaObject = {
            ...resolvedSchemaObject,
            items: resolveSchemaOrReferenceObject(
                resolvedSchemaObject.items,
                refs,
                depth,
                depthCounter + 1,
            ),
        }
    }

    return resolvedSchemaObject
}

function buildExampleTree(
    schemaObject: Readonly<OpenAPIV3.SchemaObject>,
    refs: IRefs,
): object | any[] | undefined {
    if (['boolean', 'number', 'string', 'integer'].includes(schemaObject.type!)) {
        // leaf
        return schemaObject.example ?? schemaObject.type
    }

    // if example is set, even for objects or array, short circuit
    if (schemaObject.example) {
        return schemaObject.example
    }

    // Resolve ref.
    // Inefficient: the entire (sub)tree is traversed every time. O(n^k),
    // where k is the number of children for a node
    const resolvedSchemaObject = resolveSchemaOrReferenceObject(schemaObject, refs)

    if (resolvedSchemaObject.allOf) {
        return resolveExampleAllOf(resolvedSchemaObject, refs)
    }

    if (resolvedSchemaObject.oneOf) {
        return resolveExampleOneOf(resolvedSchemaObject, refs)
    }

    if (resolvedSchemaObject.type === 'object') {
        return {
            ...resolveExampleProperties(resolvedSchemaObject.properties, refs),
            ...resolveExampleAdditionalProperties(resolvedSchemaObject.additionalProperties),
        }
    }

    if (resolvedSchemaObject.type === 'array') {
        return [
            buildExampleTree(
                resolveSchemaOrReferenceObject(resolvedSchemaObject.items, refs),
                refs,
            ),
        ]
    }

    // no example
    return undefined
}

function requestBodyObjects(
    opObject: OpenAPIV3.OperationObject,
    refs: IRefs,
    depth: number | undefined = undefined,
): {
    requestBodySchema?: OpenAPIV3.SchemaObject
    requestBodyExample?: any
    requestBodyRef?: string
} {
    if (!opObject.requestBody) {
        return {}
    }

    const jsonContent = (opObject.requestBody! as OpenAPIV3.RequestBodyObject).content[CONTENT_TYPE]
    if (!jsonContent) {
        return {}
    }

    // assume 'application/json' only
    const object = jsonContent.schema as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
    const refObject = object as OpenAPIV3.ReferenceObject
    const schemaObject = object as OpenAPIV3.SchemaObject

    return {
        requestBodySchema: resolveSchemaOrReferenceObject(schemaObject, refs, depth),
        requestBodyExample: buildExampleTree(schemaObject, refs),
        requestBodyRef: refObject.$ref,
    }
}

function responseObject(
    opObject: OpenAPIV3.OperationObject,
    statusCode: string,
    refs: IRefs,
    depth: number | undefined = undefined,
): ResponseSchema {
    const responseObject = opObject.responses[statusCode] as OpenAPIV3.ResponseObject
    const content = responseObject.content

    // assume 'application/json' only
    if (!content || !content![CONTENT_TYPE]) {
        return {
            description: responseObject.description,
        }
    }

    const mediaTypeObject: OpenAPIV3.MediaTypeObject | undefined = content![CONTENT_TYPE]
    const object = mediaTypeObject.schema as OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject
    const refObject = object as OpenAPIV3.ReferenceObject
    const schemaObject = object as OpenAPIV3.SchemaObject

    return {
        description: responseObject.description,
        schema: schemaObject
            ? resolveSchemaOrReferenceObject(schemaObject, refs, depth)
            : undefined,
        example: schemaObject ? buildExampleTree(schemaObject, refs) : undefined,
        ref: refObject.$ref,
    }
}

function responseObjects(
    opObject: OpenAPIV3.OperationObject,
    refs: IRefs,
    depth: number | undefined = undefined,
): Record<string, ResponseSchema> {
    return Object.keys(opObject.responses).reduce(
        (prev: Record<string, ResponseSchema>, statusCode: string) => {
            prev[statusCode] = responseObject(opObject, statusCode, refs, depth)
            return prev
        },
        {},
    )
}

function generateEndpoints(
    api: OpenAPIV3.Document,
    refs: IRefs,
    depth: number | undefined = undefined,
): Endpoint[] {
    return flatten(
        Object.keys(api.paths ?? {}).map((path: string): Endpoint[] => {
            const pathObject = api.paths![path] as OpenAPIV3.PathItemObject
            const endpoints: Array<Endpoint | undefined> = METHODS.map(
                (method): Endpoint | undefined => {
                    const opObject: OpenAPIV3.OperationObject | undefined = pathObject[method]
                    if (opObject === undefined) {
                        return undefined
                    }

                    return generateEndpoint(method, path, opObject, refs, depth)
                },
            )
            return endpoints.filter(
                (endpoint: Endpoint | undefined) => !isNil(endpoint),
            ) as Endpoint[]
        }),
    )
}

function generateEndpoint(
    method: string,
    path: string,
    opObject: OpenAPIV3.OperationObject,
    refs: IRefs,
    depth: number | undefined = undefined,
): Endpoint {
    if (opObject.tags === undefined) {
        throw new Error(`${opObject} must have a tag`)
    }

    const pathParameters = ((opObject.parameters ?? []) as OpenAPIV3.ParameterObject[]).filter(
        (parameter) => parameter.in === 'path',
    )

    const queryParameters = ((opObject.parameters ?? []) as OpenAPIV3.ParameterObject[]).filter(
        (parameter) => parameter.in === 'query',
    )

    return {
        method,
        path,
        summary: opObject.summary,
        description: opObject.description,
        tags: opObject.tags!,
        ...requestBodyObjects(opObject, refs, depth),
        ...(pathParameters ? { pathParameters } : {}),
        ...(queryParameters ? { queryParameters } : {}),
        responses: responseObjects(opObject, refs, depth),
    }
}

function generateResource(
    name: string,
    schemaObject: OpenAPIV3.SchemaObject,
    refs: IRefs,
    depth: number | undefined = undefined,
): Resource {
    return {
        name,
        ...resolveSchemaOrReferenceObject(schemaObject, refs, depth),
        example: schemaObject ? buildExampleTree(schemaObject, refs) : undefined,
    }
}

export function generateMarkdownFiles({
    api,
    refs,
    outputDirectory,
    endpointsPrefix,
    endpointsTemplate,
    resourceTemplate,
    resourceSchemaDepth,
    endpointSchemaDepth,
}: {
    api: OpenAPIV3.Document
    refs: IRefs
    outputDirectory?: string
    endpointsPrefix?: string
    endpointsTemplate?: string
    resourceTemplate?: string
    resourceSchemaDepth?: number
    endpointSchemaDepth?: number
}) {
    // resources
    const schemas = api.components?.schemas as Record<string, OpenAPIV3.SchemaObject> | undefined
    const resources = sortBy((name: string) => name, Object.keys(schemas ?? {})).map(
        (name: string): Resource => {
            const schemaObject = schemas![name]
            return generateResource(name, schemaObject, refs, resourceSchemaDepth)
        },
    )
    resources.map((resource: Resource) =>
        generateResourceMarkdownFile(resource, outputDirectory, resourceTemplate),
    )

    // endpoints
    const endpoints = generateEndpoints(api, refs, endpointSchemaDepth)
    const markdownTemplatesData = groupEndpointsByTag(api, endpoints)
    markdownTemplatesData.map((markdownTemplateData) =>
        generateEndpointsMarkdownFile(
            markdownTemplateData,
            outputDirectory,
            endpointsPrefix,
            endpointsTemplate,
        ),
    )
}

function generateEndpointsMarkdownFile(
    data: MarkdownTemplateData,
    outputDirectory?: string,
    endpointsPrefix?: string,
    endpointsTemplate?: string,
) {
    const file = endpointsTemplate ?? path.join(__dirname, `/../endpoints.md`)
    const templateContent = readFileSync(file)
    const template = Handlebars.compile(templateContent.toString())

    const result = template(data)

    if (outputDirectory) {
        const filename =
            data.tag.name
                .replace(/[^a-zA-Z0-9_ ]/g, '')
                .replace(/\s\s+/g, ' ')
                .replace(/\s/g, '-')
                .toLowerCase() + '.md'
        const file = path.join(outputDirectory!, `${endpointsPrefix ?? ''}${filename}`)
        writeFileSync(file, result)
        console.log(`Endpoint saved: ${file}`)
        return
    }

    console.log(result)
}

function generateResourceMarkdownFile(
    resource: Resource,
    outputDirectory?: string,
    resourceTemplate?: string,
) {
    const file = resourceTemplate ?? path.join(__dirname, `/../resource.md`)
    const templateContent = readFileSync(file)
    const template = Handlebars.compile(templateContent.toString())

    const result = template(resource)

    if (outputDirectory) {
        const filename =
            resource.name
                .replace(/[^a-zA-Z0-9_ ]/g, '')
                .replace(/\s\s+/g, ' ')
                .replace(/\s/g, '-')
                .toLowerCase() + '.md'
        const file = path.join(outputDirectory!, filename)
        writeFileSync(file, result)
        console.log(`Resource saved: ${file}`)
        return
    }

    console.log(result)
}

function extractTagByName(
    api: OpenAPIV3.Document,
    tagName: string,
): OpenAPIV3.TagObject | undefined {
    return find(
        (tagObject: OpenAPIV3.TagObject | undefined): boolean => tagObject?.name === tagName,
        api.tags ?? [],
    )
}

function groupEndpointsByTag(
    api: OpenAPIV3.Document,
    endpoints: Endpoint[],
): MarkdownTemplateData[] {
    const denormaliseByTag: Endpoint[] = flatten(
        endpoints.map((endpoint: Endpoint): Endpoint[] =>
            endpoint.tags.map((tag: string): Endpoint => ({ ...endpoint, tags: [tag] })),
        ),
    )
    const groupedByTagName: Record<string, Endpoint[]> = groupBy(
        (endpoint: Endpoint) => endpoint.tags[0],
        denormaliseByTag,
    )

    return Object.keys(groupedByTagName).map((tagName: string): MarkdownTemplateData => {
        const endpoints = groupedByTagName[tagName]
        const tagObject = extractTagByName(api, tagName)

        return {
            tag: {
                name: tagName,
                description: tagObject?.description,
            },
            endpoints,
        }
    })
}
