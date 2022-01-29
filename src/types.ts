import { OpenAPIV3 } from 'openapi-types'

export type ResponseSchema = {
    description?: string
    schema?: OpenAPIV3.SchemaObject
    ref?: string
    example?: any
}

// Endpoint interface consumed by the markdown template
export interface Endpoint {
    method: string
    path: string
    tags: string[]
    summary?: string
    description?: string
    requestBodySchema?: OpenAPIV3.SchemaObject
    requestBodyRef?: string
    requestBodyExample?: any
    pathParameters?: OpenAPIV3.ParameterObject[]
    queryParameters?: OpenAPIV3.ParameterObject[]
    responses: Record<string, ResponseSchema>
}

export interface MarkdownTemplateData {
    tag: { name: string; description?: string }
    endpoints: Endpoint[]
}

export type Properties = Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>
export type Resource = { name: string; example?: any } & OpenAPIV3.SchemaObject

export interface IRefs {
    // any: not great, https://github.com/APIDevTools/swagger-parser/blob/main/lib/index.d.ts#L428
    get(ref: string): any
}
