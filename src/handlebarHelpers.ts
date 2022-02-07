import * as Handlebars from 'handlebars'

Handlebars.registerHelper('breaklines', (text) => {
    if (!text) {
        return ''
    }
    return new Handlebars.SafeString(text.replace(/(\r\n|\n|\r)/gm, '<br>'))
})

// do I really need to write these myself?
Handlebars.registerHelper('uppercase', (text) => {
    return text.toUpperCase()
})

Handlebars.registerHelper('json', (obj) => {
    return JSON.stringify(obj, null, 4)
})

Handlebars.registerHelper('log', (args) => {
    console.log(args)
})

Handlebars.registerHelper('join', (arr, del) => {
    return arr.join(del)
})

Handlebars.registerHelper({
    eq: (v1, v2) => v1 === v2,
    ne: (v1, v2) => v1 !== v2,
    lt: (v1, v2) => v1 < v2,
    gt: (v1, v2) => v1 > v2,
    lte: (v1, v2) => v1 <= v2,
    gte: (v1, v2) => v1 >= v2,
    and() {
        return Array.prototype.every.call(arguments, Boolean)
    },
    or() {
        return Array.prototype.slice.call(arguments, 0, -1).some(Boolean)
    },
    in: (v1, arr) => arr && arr.indexOf(v1) > -1,
})

Handlebars.registerHelper('refToResourceName', refToResourceName)

Handlebars.registerHelper('refToResourceLink', (ref) => {
    const resourceName = refToResourceName(ref)
    if (!resourceName) {
        return undefined
    }
    const resourceLink = resourceName
        .replace(/[^a-zA-Z0-9_ ]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace(/\s/g, '-')
        .toLowerCase()
    return `${resourceLink}.html`
})

function refToResourceName(ref: string | undefined): string | undefined {
    if (ref === undefined) {
        return undefined
    }
    const items = ref.split('/')
    if (!items) {
        return undefined
    }
    return items[items.length - 1]
}
