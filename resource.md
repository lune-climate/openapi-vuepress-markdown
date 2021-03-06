---
sidebarDepth: 0
---
{{#*inline "typeDetails" key property required }}
{{#if (and (eq property.type 'array') (ne property.items.$ref undefined)) }} of [{{ refToResourceName property.items.$ref }}]({{ refToResourceLink property.items.$ref }}){{/if ~}}
{{#if (and (eq property.type 'object') (ne property.$ref undefined)) }} object [{{ refToResourceName property.$ref }}]({{ refToResourceLink property.$ref }}){{/if ~}}
{{#if (and (eq property.type undefined) (ne property.$ref undefined)) }}[{{ refToResourceName property.$ref }}]({{ refToResourceLink property.$ref }}){{/if ~}}
{{#if property.oneOf }}<br /><br />One of: <ul>{{# each property.oneOf}}<li>[{{ refToResourceName this.ref }}]({{ refToResourceLink this.ref }})</li>{{/each ~}}</ul>{{/if ~}}
{{#if (in key required) }}<br />_**required**_{{/if ~}}
{{#if property.enum }}<br /><br />Enum: <ul>{{#each property.enum }}<li>`{{ this }}`</li>{{/each}}</ul>{{/if ~}}
{{/inline}}

{{#*inline "row" key property required }}
### {{ key }}

Type: {{ property.type }}{{> typeDetails key=key property=property required=required}}

{{{ breaklines property.description }}}
{{/inline}}

## {{ name }}

{{{ description }}}

{{#if discriminator}}
One of with discriminator:

Property: **{{ discriminator.propertyName }}**

{{#each discriminator.mapping }}
* {{ @key}}: [{{ refToResourceName this }}]({{ refToResourceLink this }})
{{/each}}

{{else if oneOf }}
{{#each oneOf }}One of: [{{ refToResourceName this.ref }}]({{ refToResourceLink this.ref }}) {{/each}}
{{/if}}


{{#if oneOf }}
{{#each oneOf }}
#### [{{ refToResourceName this.ref }}]({{ refToResourceLink this.ref }})
{{#each this.properties}}
{{> row key=@key property=this required=../required}}
{{/each}}
{{/each}}


{{else if properties}}
{{#each properties}}
{{> row key=@key property=this required=../required}}
{{/each}}
{{/if}}

{{#if (eq type "string")}}Type: {{ type }}{{/if}}

{{#if enum }}Enum: <ul>{{#each enum }}<li>`{{ this }}`</li>{{/each}}</ul>{{/if}}

{{#if example }}
##### Example
```json
{{{json example }}}
```
{{/if}}
