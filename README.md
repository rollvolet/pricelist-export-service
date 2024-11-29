# Pricelist export service

Export products and price info to a CSV-file. Task-based execution, triggered by delta messages.
Uses the [RPIO Task model](https://drive.google.com/file/d/1rh0Y8fC6THmRCzhr2XMSouASDNgYzXTY/view?usp=sharing).
  
Based on following SPARQL-query:

https://github.com/rollvolet/pricelist-export-service/blob/c39276ed171424ff48d43e4707ca1764af66f293/pricelist-export.js#L18-L72

## Example configuration

`docker-compose.yml`
```yml
  pricelist-export:
    image: rollvolet/pricelist-export-service
    volumes:
      - ./data/files:/share
```

`config/delta/rules.js`
```js
  {
    match: {
      predicate: {
        type: "uri",
        value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      },
      object: {
        type: "uri",
        value: "http://redpencil.data.gift/vocabularies/tasks/Task",
      },
    },
    callback: {
      url: "http://pricelist-export/delta",
      method: "POST"
    },
    options: {
      resourceFormat: "v0.0.1",
      gracePeriod: 500,
      ignoreFromSelf: true
    }
  },
```
