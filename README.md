# openapi-vuepress-markdown

openapi-vuepress-markdown is a library that generates a Vue Press compatible API Reference from an OpenAPI specification.

## Usage

### From source

Typescript:

```bash
yarn
yarn run ts-node src/openapi-vuepress-markdown.ts -s <openapi-schema> -o <output-directory>
```

Node:

```bash
yarn build
node dist/openapi-vuepress-markdown.js -s <openapi-schema> -o <output-directory>
```

## Disclaimer

**openapi-vuepress-markdown** does not generate .vuepress/config.js sidebar navigation.
