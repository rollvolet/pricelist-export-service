import bodyParser from 'body-parser';
import { app, errorHandler } from 'mu';
import {
  querySudo,
  updateSudo,
} from '@lblod/mu-auth-sudo';
import { runTask, findActionableTaskQuery } from './lib/task';
import { parseResult } from './lib/query-utils';
import exportPricelist from './pricelist-export';
import { PRICELIST_EXPORT_TASK_OPERATION } from './config';

const GRAPH = 'http://mu.semte.ch/graphs/rollvolet';
const actionableTaskQuery = findActionableTaskQuery(PRICELIST_EXPORT_TASK_OPERATION, GRAPH);

// function with the signature that task runner expects
async function stdExportPricelist() {
  const file = await exportPricelist(GRAPH);
  return [file.uri];
}

const runPendingTasks = (function (){
  let running;
  return async function () {
    if (running) {
      return;
    }
    running = true;
    let actionableTaskResult = await querySudo(actionableTaskQuery);
    let actionableTask = parseResult(actionableTaskResult)[0];
    if (!actionableTask) {
        console.log('No tasks found in queue.');
        return;
    }
    do {
      await runTask(actionableTask.uri, GRAPH, stdExportPricelist, querySudo, updateSudo);
      actionableTaskResult = await querySudo(actionableTaskQuery);
      actionableTask = parseResult(actionableTaskResult)[0];
    } while (actionableTask);
    console.log('No more tasks in queue.');
    running = false;
  }
})();

app.use(bodyParser.json());

app.post('/delta', (req, res) => {
  const newTasks = req.body
    .map((changeSet) => changeSet.inserts)
    .flat()
    .filter(
      (t) =>
        t.predicate.value ===
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
        t.object.value === 'http://redpencil.data.gift/vocabularies/tasks/Task'
    )
    .map((t) => t.subject.value);
  if (!newTasks.length) {
    return res.status(204).send();
  }
  console.log(`Received ${newTasks.length} new tasks through delta's.`)
  runPendingTasks();
  return res.status(202).send();
});
