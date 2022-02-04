{{#*inline "typeDetails" key property required }}
{{#if (and (eq property.type 'array') (ne property.items.$ref undefined)) }} of [{{ refToResourceName property.items.$ref }}]({{ refToResourceLink property.items.$ref }}){{/if ~}}
{{#if (and (eq property.type 'object') (ne property.$ref undefined)) }} object [{{ refToResourceName property.$ref }}]({{ refToResourceLink property.$ref }}){{/if ~}}
{{#if (and (eq property.type undefined) (ne property.$ref undefined)) }}[{{ refToResourceName property.$ref }}]({{ refToResourceLink property.$ref }}){{/if ~}}
{{#if property.oneOf }}<br /><br />One of: <ul>{{# each property.oneOf}}<li>[{{ refToResourceName this.ref }}]({{ refToResourceLink this.ref }})</li>{{/each ~}}</ul>{{/if ~}}
{{#if (in key required) }}<br />_**required**_{{/if ~}}
{{#if property.enum }}<br /><br />Enum: <ul>{{#each property.enum }}<li>`{{ this }}`</li>{{/each}}</ul>{{/if ~}}
{{/inline}}

{{#*inline "row" key property required }}
| {{ key }} | {{ property.type }}{{> typeDetails key=key property=property required=required}} | {{ breaklines property.description }} |
{{/inline}}

{{#*inline "schemaMarkdown" schema example }}
{{#if schema.items}}
Array of:
{{/if}}

{{#if schema.discriminator}}
One of with discriminator:

Property: **{{ schema.discriminator.propertyName }}**

{{#each schema.discriminator.mapping }}
* {{ @key}}: [{{ refToResourceName this }}]({{ refToResourceLink this }})
{{/each}}

{{else if schema.oneOf }}
{{#each schema.oneOf }}One of: [{{ refToResourceName this.ref }}]({{ refToResourceLink this.ref }}) {{/each}}
{{/if}}

{{#if schema.oneOf }}
{{#each schema.oneOf }}
#### [{{ refToResourceName this.ref }}]({{ refToResourceLink this.ref }})
{{#each this.properties}}
{{> row key=@key property=this required=../required}}
{{/each}}
{{/each}}

{{else if schema.properties }}

| Field | Type | Description |
| ----- | ---- | ------------|
{{#each schema.properties}}
{{> row key=@key property=this required=../schema.required }}
{{/each}}
{{#each schema.items.properties}}
{{> row key=@key property=this required=../schema.items.required }}
{{/each}}

{{/if}}

{{#if example }}
##### Example
```json
{{{json example }}}
```
{{/if}}
{{/inline}}


# {{ tag.name }}

{{{ tag.description }}}

{{#each endpoints }}

## {{ this.summary }}

{{{ this.description }}}

```
{{ uppercase this.method }} {{ this.path }}
```

{{#if this.pathParameters}}
#### Path Parameters
| Field | Type | Description | Example |
| ----- | ---- | -------- | ----------- | ------- |
{{#each this.pathParameters}}
| {{ this.name }} | {{ this.schema.type }} {{#if this.required }}<br />_**required**_{{/if}} | {{{ breaklines this.description }}} | {{ this.schema.example }} |
{{/each}}
{{/if}}

{{#if this.queryParameters}}
#### Query Parameters
| Field | Type | Description | Example |
| ----- | ---- | -------- | ----------- | ------- |
{{#each this.queryParameters}}
| {{ this.name }} | {{ this.schema.type }} {{#if this.required }}<br />_**required**_{{/if}} | {{{ breaklines this.description }}} | {{ this.schema.example }} |
{{/each}}
{{/if}}

{{#if this.requestBodySchema }}
#### Request Body{{#if this.requestBodyRef }} [{{ refToResourceName this.requestBodyRef }}]({{ refToResourceLink this.requestBodyRef }}){{/if}}:
{{> schemaMarkdown schema=this.requestBodySchema example=this.requestBodyExample }}
{{/if}}

### Responses
{{#each this.responses }}

**{{ @key }}** {{{this.description}}}

{{#if (or (ne this.schema.properties undefined) (ne this.schema.items undefined))}}
#### Response Body{{#if this.ref }} [{{ refToResourceName this.ref }}]({{ refToResourceLink this.ref }}){{/if}}:
{{> schemaMarkdown schema=this.schema example=this.example }}
{{/if}}

{{/each}}

{{/each}}
