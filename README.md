# Pricelist export service

Export products and price info to a CSV-file. Task-based execution, triggered by delta messages.
Uses the [RPIO Task model](https://drive.google.com/file/d/1rh0Y8fC6THmRCzhr2XMSouASDNgYzXTY/view?usp=sharing).
  
Based on following SPARQL-query:

https://github.com/rollvolet/pricelist-export-service/blob/c39276ed171424ff48d43e4707ca1764af66f293/pricelist-export.js#L18-L72

## Example configuration

`docker-compose.yml`
```yml
  pricelist-export:
    image: semtech/mu-javascript-template:1.8.0
    volumes:
      - /home/michael/rpio/projects/ROLL/pricelist-export-service:/app
      - ./data/files:/share
    environment:
      NODE_ENV: "development"
    restart: always
    logging: *default-logging
    labels:
      - "logging=true"
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

`config/authorization/config.ex`
```ex
      %GroupSpec{
        name: "rollvolet-write",
        useage: [:read, :write, :read_for_write],
        access: authenticated_access(),
        graphs: [
          %GraphSpec{
            graph: "http://mu.semte.ch/graphs/rollvolet",
            constraint: %ResourceConstraint{
              resource_types: [
                ...
                "http://redpencil.data.gift/vocabularies/tasks/Task"
              ]
            }
          }
        ]
```

`config/resource/task.lisp`

```lisp
(define-resource task ()
  :class (s-prefix "task:Task")
  :properties `((:created :datetime ,(s-prefix "dct:created"))
                (:modified :datetime ,(s-prefix "dct:modified"))
                (:status :url ,(s-prefix "adms:status"))
                (:operation :url ,(s-prefix "task:operation"))
                (:index :string ,(s-prefix "task:index")))
  :has-many `((task :via ,(s-prefix "cogs:dependsOn")
                    :as "parent-tasks"))
  :has-one `((data-container :via ,(s-prefix "task:resultContainer")
                   :as "result-container")
             (data-container :via ,(s-prefix "task:inputContainer")
                   :as "input-container")
             )
  :resource-base (s-url "http://data.rollvolet.be/tasks/")
  :features '(include-uri)
  :on-path "tasks")

(define-resource data-container ()
  :class (s-prefix "nfo:DataContainer")
  :has-one `((task :via ,(s-prefix "task:resultContainer")
                    :inverse t
                    :as "result-from-tasks")
              (task :via ,(s-prefix "task:inputContainer")
                    :inverse t
                    :as "input-from-tasks"))
  :has-many `((file :via ,(s-prefix "ext:content")
                    :as "files")
              )
  :resource-base (s-url "http://data.rollvolet.be/data-containers/")
  :features '(include-uri)
  :on-path "data-containers")
```

`config/dispatcher/dispatcher.ex`

```ex
  match "/tasks/*path", @json_service do
    Proxy.forward conn, path, "http://cache/tasks/"
  end

  match "/data-containers/*path", @json_service do
    Proxy.forward conn, path, "http://cache/data-containers/"
  end

```
