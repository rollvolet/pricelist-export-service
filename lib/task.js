/* eslint-disable quotes */
import {
  sparqlEscapeUri,
  sparqlEscapeString,
  sparqlEscapeDateTime,
  uuid as generateUuid
} from "mu";
import { RESOURCE_BASE } from '../config';

const MU_APPLICATION_GRAPH = process.env.MU_APPLICATION_GRAPH;

const STATUS_BUSY = "http://redpencil.data.gift/id/concept/JobStatus/busy"
const STATUS_SCHEDULED = "http://redpencil.data.gift/id/concept/JobStatus/scheduled"
const STATUS_SUCCESS = "http://redpencil.data.gift/id/concept/JobStatus/success"
const STATUS_FAILED = "http://redpencil.data.gift/id/concept/JobStatus/failed"

function attachTaskResultsQuery (task, results, graph = MU_APPLICATION_GRAPH) {
  const CONTAINER_URI_PREFIX = RESOURCE_BASE + '/containers/'
  const containerUuid = generateUuid();
  const containerUri = CONTAINER_URI_PREFIX + containerUuid;

  return `
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

INSERT {
    GRAPH ${sparqlEscapeUri(graph) ?? "?g"} {
        ${sparqlEscapeUri(containerUri)} a nfo:DataContainer ;
            mu:uuid ${sparqlEscapeString(containerUuid)} ;
            ext:content ${results.map(sparqlEscapeUri).join(", ")} .
        ${sparqlEscapeUri(task)} task:resultContainer ${sparqlEscapeUri(containerUri)} .
    }
}
WHERE {
    GRAPH ${sparqlEscapeUri(graph) ?? "?g"} {
        ${sparqlEscapeUri(task)} a task:Task .
    }
}`;
}

function updateTaskStatusQuery (task, status, graph = MU_APPLICATION_GRAPH) {
  const time = new Date();

  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>

DELETE {
    GRAPH ${graph ? sparqlEscapeUri(graph) : "?g"} {
        ${sparqlEscapeUri(task)} adms:status ?old_status ;
            dct:modified ?old_modified .
    }
}
INSERT {
    GRAPH ${graph ? sparqlEscapeUri(graph) : "?g"} {
        ${sparqlEscapeUri(task)} adms:status ${sparqlEscapeUri(status)} ;
            dct:modified ${sparqlEscapeDateTime(time)} .
    }
}
WHERE {
    GRAPH ${graph ? sparqlEscapeUri(graph) : "?g"} {
      ${sparqlEscapeUri(task)} a task:Task .
      OPTIONAL { ${sparqlEscapeUri(task)} adms:status ?old_status . }
      OPTIONAL { ${sparqlEscapeUri(task)} dct:modified ?old_modified . }
  }
}`;
}


function findActionableTaskQuery (operationType = null, graph = MU_APPLICATION_GRAPH) {
  let operationTypeSnippet;
  if (operationType) {
    operationTypeSnippet = `?task task:operation ${sparqlEscapeUri(operationType)}`;
  } else {
    operationTypeSnippet = '';
  }
  return `
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

SELECT (?task as ?uri) (?uuid as ?id) ?created ?used  WHERE {
    GRAPH ${sparqlEscapeUri(graph)} {
        ?task a task:Task ;
            dct:created ?created ;
            adms:status ${sparqlEscapeUri(STATUS_SCHEDULED)} ;
            mu:uuid ?uuid .
        OPTIONAL { ?task task:inputContainer/ext:content ?used }
        ${operationTypeSnippet}
    }
}
ORDER BY ASC(?created)
LIMIT 1`;
}

async function runTask (task, graph, runnerFunc, sparqlQuery, sparqlUpdate) {
  const taskResults = await sparqlQuery(findActionableTaskQuery(null, graph));
  let used;
  if (taskResults?.results?.bindings) {
    used = taskResults.results.bindings.map((t) => t.used?.value);
  } else {
    throw new Error(`Didn't find actionable task for <${task}>`);
  }

  await sparqlUpdate(updateTaskStatusQuery(task, STATUS_BUSY, graph));
  try {
    console.info(`Running task <${task}>`);
    const generated = await runnerFunc(used);
    if (generated) {
      await sparqlUpdate(attachTaskResultsQuery(task, generated, graph));
    }
    await sparqlUpdate(updateTaskStatusQuery(task, STATUS_SUCCESS, graph));
    return generated;
  } catch (e) {
    await sparqlUpdate(updateTaskStatusQuery(task, STATUS_FAILED, graph));
    console.error(e);
  }
}

export {
  attachTaskResultsQuery,
  findActionableTaskQuery,
  updateTaskStatusQuery,
  runTask,
};
