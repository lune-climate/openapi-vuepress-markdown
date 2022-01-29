import { IRefs, Properties } from '../src/types'
import { OpenAPIV3 } from 'openapi-types'
import rewire from 'rewire'
const markdownAdapters = rewire('../dist/markdownAdapters')

function createIRefsMock(): jest.Mocked<IRefs> {
    return {
        get: jest.fn(),
    }
}

describe('markdownAdapters', () => {
    let mergeSchemaObjects: (...schemaObjects: OpenAPIV3.SchemaObject[]) => OpenAPIV3.SchemaObject
    let resolveAllOf: (
        schemaObject: OpenAPIV3.SchemaObject,
        refs: IRefs,
        depth: number | undefined,
        depthCounter: number,
    ) => OpenAPIV3.SchemaObject
    let resolveProperties: (
        properties: Properties | undefined,
        refs: IRefs,
        depth: number | undefined,
        depthCounter: number,
    ) => Properties | undefined
    let resolveSchemaOrReferenceObject: (
        schemaObject: Readonly<OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
        refs: IRefs,
        depth: number | undefined,
        depthCounter: number,
    ) => OpenAPIV3.SchemaObject
    let requestBodyObjects: (
        opObject: Readonly<OpenAPIV3.OperationObject>,
        refs: IRefs,
        depth: number | undefined,
    ) => {
        requestBodySchema?: OpenAPIV3.SchemaObject
        requestBodyExample?: any
        requestBodyRef?: string
    }

    beforeAll(() => {
        // access non-exported functions
        mergeSchemaObjects = markdownAdapters.__get__('mergeSchemaObjects')
        resolveAllOf = markdownAdapters.__get__('resolveAllOf')
        resolveProperties = markdownAdapters.__get__('resolveProperties')
        resolveSchemaOrReferenceObject = markdownAdapters.__get__('resolveSchemaOrReferenceObject')
        requestBodyObjects = markdownAdapters.__get__('requestBodyObjects')
    })

    test('mergeSchemaObjects should merge all schemaObject fields', () => {
        const schemaObject = mergeSchemaObjects(
            {
                description:
                    'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
                type: 'object',
                required: ['prop1'],
                properties: {
                    prop1: {
                        type: 'number',
                        example: 3,
                        description: 'foo',
                    },
                    prop2: {
                        type: 'string',
                        example: 'bar',
                        description: 'desc',
                    },
                },
            },
            {
                type: 'object',
                required: ['prop3'],
                properties: {
                    prop3: {
                        type: 'number',
                        description: 'desc 4',
                    },
                },
                additionalProperties: { type: 'string' },
            },
        )

        expect(schemaObject).toEqual({
            type: 'object',
            description:
                'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
            required: ['prop1', 'prop3'],
            properties: {
                prop1: {
                    type: 'number',
                    example: 3,
                    description: 'foo',
                },
                prop2: {
                    type: 'string',
                    example: 'bar',
                    description: 'desc',
                },
                prop3: {
                    type: 'number',
                    description: 'desc 4',
                },
            },
            additionalProperties: { type: 'string' },
        })
    })

    describe('resolveAllOf', () => {
        test('should merge allOf schema objects', () => {
            const schemaObject = resolveAllOf(
                {
                    allOf: [
                        {
                            type: 'object',
                            required: ['a', 'b'],
                            properties: {
                                a: {
                                    type: 'string',
                                    pattern: '^[0-9]+$',
                                    example: '1045',
                                },
                                b: {
                                    type: 'string',
                                    description: 'foo',
                                    enum: ['enum1', 'enum2'],
                                },
                            },
                        },
                        {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'string',
                                    example: 'bar',
                                },
                            },
                        },
                    ],
                },
                createIRefsMock(),
                undefined,
                0,
            )

            expect(schemaObject).toEqual({
                type: 'object',
                required: ['a', 'b'],
                properties: {
                    a: {
                        type: 'string',
                        pattern: '^[0-9]+$',
                        example: '1045',
                    },
                    b: {
                        type: 'string',
                        description: 'foo',
                        enum: ['enum1', 'enum2'],
                    },
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })
        })

        test('should merge allOf schema object and reference objects', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockReturnValue({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })

            const schemaObject = resolveAllOf(
                {
                    allOf: [
                        { $ref: '#/Something' },
                        {
                            type: 'object',
                            required: ['a', 'b'],
                            properties: {
                                a: {
                                    type: 'string',
                                    pattern: '^[0-9]+$',
                                    example: '1045',
                                },
                                b: {
                                    type: 'string',
                                    description: 'foo',
                                    enum: ['enum1', 'enum2'],
                                },
                            },
                        },
                    ],
                },
                refsMock,
                undefined,
                0,
            )

            expect(refsMock.get).toHaveBeenCalledWith('#/Something')
            expect(schemaObject).toEqual({
                type: 'object',
                required: ['a', 'b'],
                properties: {
                    a: {
                        type: 'string',
                        pattern: '^[0-9]+$',
                        example: '1045',
                    },
                    b: {
                        type: 'string',
                        description: 'foo',
                        enum: ['enum1', 'enum2'],
                    },
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })
        })

        test('should return itself if allOf is not present', () => {
            const schemaObject = resolveAllOf(
                {
                    type: 'object',
                    required: ['a', 'b'],
                    properties: {
                        a: {
                            type: 'string',
                            pattern: '^[0-9]+$',
                            example: '1045',
                        },
                        b: {
                            type: 'string',
                            description: 'foo',
                            enum: ['enum1', 'enum2'],
                        },
                    },
                },
                createIRefsMock(),
                undefined,
                0,
            )

            expect(schemaObject).toEqual({
                type: 'object',
                required: ['a', 'b'],
                properties: {
                    a: {
                        type: 'string',
                        pattern: '^[0-9]+$',
                        example: '1045',
                    },
                    b: {
                        type: 'string',
                        description: 'foo',
                        enum: ['enum1', 'enum2'],
                    },
                },
            })
        })

        test('should include fields at the same level of the allOf clause', () => {
            const schemaObject = resolveAllOf(
                {
                    title: 'Title',
                    description: 'Description',
                    allOf: [
                        {
                            type: 'object',
                            required: ['a', 'b'],
                            properties: {
                                a: {
                                    type: 'string',
                                    pattern: '^[0-9]+$',
                                    example: '1045',
                                },
                                b: {
                                    type: 'string',
                                    description: 'foo',
                                    enum: ['enum1', 'enum2'],
                                },
                            },
                        },
                        {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'string',
                                    example: 'bar',
                                },
                            },
                        },
                    ],
                },
                createIRefsMock(),
                undefined,
                0,
            )

            expect(schemaObject).toEqual({
                title: 'Title',
                description: 'Description',
                type: 'object',
                required: ['a', 'b'],
                properties: {
                    a: {
                        type: 'string',
                        pattern: '^[0-9]+$',
                        example: '1045',
                    },
                    b: {
                        type: 'string',
                        description: 'foo',
                        enum: ['enum1', 'enum2'],
                    },
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })
        })
    })

    describe('resolveProperties', () => {
        test('should return the same properties if a reference object is not present', () => {
            const properties = resolveProperties(
                {
                    a: {
                        type: 'string',
                        pattern: '^[0-9]+$',
                        example: '1045',
                    },
                    b: {
                        type: 'string',
                        description: 'foo',
                        enum: ['enum1', 'enum2'],
                    },
                },
                createIRefsMock(),
                undefined,
                0,
            )

            expect(properties).toEqual({
                a: {
                    type: 'string',
                    pattern: '^[0-9]+$',
                    example: '1045',
                },
                b: {
                    type: 'string',
                    description: 'foo',
                    enum: ['enum1', 'enum2'],
                },
            })
        })

        test('should return resolved properties if a reference is present', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockReturnValue({
                type: 'object',
                properties: {
                    z: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })

            const properties = resolveProperties(
                {
                    a: {
                        type: 'string',
                        pattern: '^[0-9]+$',
                        example: '1045',
                    },
                    b: {
                        type: 'string',
                        description: 'foo',
                        enum: ['enum1', 'enum2'],
                    },
                    c: { $ref: '#/Something' },
                },
                refsMock,
                undefined,
                0,
            )

            expect(refsMock.get).toHaveBeenCalledWith('#/Something')
            expect(properties).toEqual({
                a: {
                    type: 'string',
                    pattern: '^[0-9]+$',
                    example: '1045',
                },
                b: {
                    type: 'string',
                    description: 'foo',
                    enum: ['enum1', 'enum2'],
                },
                c: {
                    type: 'object',
                    properties: {
                        z: {
                            type: 'string',
                            example: 'bar',
                        },
                    },
                },
            })
        })
    })

    describe('resolveSchemaOrReferenceObject', () => {
        test('should resolve a reference object', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockReturnValue({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })

            const schemaObject = resolveSchemaOrReferenceObject(
                { $ref: '#/Something' },
                refsMock,
                undefined,
                0,
            )

            expect(refsMock.get).toHaveBeenCalledWith('#/Something')
            expect(schemaObject).toEqual({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })
        })

        test('should resolve an object with reference properties', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockReturnValue({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })

            const schemaObject = resolveSchemaOrReferenceObject(
                {
                    type: 'object',
                    properties: {
                        c: {
                            type: 'string',
                            example: 'bar',
                        },
                        a: { $ref: '#/Something' },
                    },
                },
                refsMock,
                undefined,
                0,
            )

            expect(refsMock.get).toHaveBeenCalledWith('#/Something')
            expect(schemaObject).toEqual({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                    a: {
                        type: 'object',
                        properties: {
                            c: {
                                type: 'string',
                                example: 'bar',
                            },
                        },
                    },
                },
            })
        })

        test('should resolve an array of objects with references', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockReturnValue({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })

            const schemaObject = resolveSchemaOrReferenceObject(
                {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            c: {
                                type: 'string',
                                example: 'bar',
                            },
                            a: { $ref: '#/Something' },
                        },
                    },
                },
                refsMock,
                undefined,
                0,
            )

            expect(refsMock.get).toHaveBeenCalledWith('#/Something')
            expect(schemaObject).toEqual({
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        c: {
                            type: 'string',
                            example: 'bar',
                        },
                        a: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'string',
                                    example: 'bar',
                                },
                            },
                        },
                    },
                },
            })
        })

        test('should resolve an array of reference objects', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockReturnValue({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })

            const schemaObject = resolveSchemaOrReferenceObject(
                {
                    type: 'array',
                    items: { $ref: '#/Something' },
                },
                refsMock,
                undefined,
                0,
            )

            expect(refsMock.get).toHaveBeenCalledWith('#/Something')
            expect(schemaObject).toEqual({
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        c: {
                            type: 'string',
                            example: 'bar',
                        },
                    },
                },
            })
        })

        test('should resolve a nested reference object', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockImplementation((ref: string) => {
                switch (ref) {
                    case '#/Something':
                        return {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'string',
                                    example: 'bar',
                                },
                                d: { $ref: '#/SomethingElse' },
                            },
                        }
                    case '#/SomethingElse':
                        return {
                            type: 'object',
                            properties: {
                                a: {
                                    type: 'string',
                                    example: 'foo',
                                },
                                b: { $ref: '#/SomethingElseAgain' },
                            },
                        }
                    default:
                        return {
                            type: 'number',
                            example: 10,
                        }
                }
            })

            const schemaObject = resolveSchemaOrReferenceObject(
                { $ref: '#/Something' },
                refsMock,
                undefined,
                0,
            )

            expect(refsMock.get).toHaveBeenNthCalledWith(1, '#/Something')
            expect(refsMock.get).toHaveBeenNthCalledWith(2, '#/SomethingElse')
            expect(refsMock.get).toHaveBeenNthCalledWith(3, '#/SomethingElseAgain')
            expect(schemaObject).toEqual({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                    d: {
                        type: 'object',
                        properties: {
                            a: {
                                type: 'string',
                                example: 'foo',
                            },
                            b: {
                                type: 'number',
                                example: 10,
                            },
                        },
                    },
                },
            })
        })
    })

    describe('requestBodyObjects', () => {
        test('should expand the schema two levels', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockReturnValue({
                type: 'object',
                properties: {
                    c: {
                        type: 'string',
                        example: 'bar',
                    },
                },
            })

            const opObject = {
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['a', 'b'],
                                properties: {
                                    a: {
                                        type: 'string',
                                        pattern: '^[0-9]+$',
                                        example: '1045',
                                    },
                                    b: { $ref: '#/Something' },
                                },
                            },
                        },
                    },
                },
            } as unknown as OpenAPIV3.OperationObject

            const requestObjects = requestBodyObjects(opObject, refsMock, undefined)

            expect(refsMock.get).toHaveBeenCalledWith('#/Something')
            expect(requestObjects.requestBodyRef).toBeUndefined()
            expect(requestObjects.requestBodySchema).toEqual({
                type: 'object',
                required: ['a', 'b'],
                properties: {
                    a: {
                        type: 'string',
                        pattern: '^[0-9]+$',
                        example: '1045',
                    },
                    b: {
                        type: 'object',
                        properties: {
                            c: {
                                type: 'string',
                                example: 'bar',
                            },
                        },
                    },
                },
            })
            expect(requestObjects.requestBodyExample).toEqual({
                a: '1045',
                b: {
                    c: 'bar',
                },
            })
        })

        test('should expand the schema two levels and not beyond', () => {
            const refsMock = createIRefsMock()
            refsMock.get.mockImplementation((ref: string) => {
                switch (ref) {
                    case '#/Something':
                        return {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'string',
                                    example: 'bar',
                                },
                                d: { $ref: '#/SomethingElse' },
                            },
                        }
                    case '#/SomethingElse':
                        return {
                            type: 'object',
                            properties: {
                                a: {
                                    type: 'string',
                                    example: 'foo',
                                },
                                b: { $ref: '#/SomethingElseAgain' },
                            },
                        }
                    default:
                        return {
                            type: 'number',
                            example: 10,
                        }
                }
            })

            const opObject = {
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['a', 'b'],
                                properties: {
                                    a: {
                                        type: 'string',
                                        pattern: '^[0-9]+$',
                                        example: '1045',
                                    },
                                    b: { $ref: '#/Something' },
                                },
                            },
                        },
                    },
                },
            } as unknown as OpenAPIV3.OperationObject

            const requestObjects = requestBodyObjects(opObject, refsMock, 2)

            expect(refsMock.get).toHaveBeenCalledWith('#/Something')
            expect(requestObjects.requestBodyRef).toBeUndefined()
            expect(requestObjects.requestBodySchema).toEqual({
                type: 'object',
                required: ['a', 'b'],
                properties: {
                    a: {
                        type: 'string',
                        pattern: '^[0-9]+$',
                        example: '1045',
                    },
                    b: {
                        type: 'object',
                        properties: {
                            c: {
                                type: 'string',
                                example: 'bar',
                            },
                            d: { $ref: '#/SomethingElse' },
                        },
                    },
                },
            })
            expect(requestObjects.requestBodyExample).toEqual({
                a: '1045',
                b: {
                    c: 'bar',
                    d: {
                        a: 'foo',
                        b: 10,
                    },
                },
            })
        })
    })
})
